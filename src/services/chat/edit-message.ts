'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import {
	editMessageInputSchema,
	type EditMessageInput,
	type Message,
	messageSchema,
} from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Edits a previously sent message. The backend enforces both authorship
 * (`chat:message:permission-denied`) and the edit window
 * (`chat:message:edit-window-expired`) — the UI just forwards the new body.
 *
 * @param messageId - UUID of the message to edit.
 * @param input - Replacement body (min 1, max 4000 chars).
 * @returns ServiceResponse with the updated message on success.
 */
export async function editMessage(
	messageId: string,
	input: EditMessageInput,
): Promise<ServiceResponse<Message, ChatErrorCode>> {
	const validated = editMessageInputSchema.safeParse(input);
	if (!validated.success) {
		return failure(CHAT_ERROR_CODES.MESSAGE_INVALID_BODY);
	}

	try {
		const response = await authenticatedClient.patch(
			`/chat/messages/${messageId}`,
			validated.data,
		);
		return success(messageSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'edit-message');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'edit-message',
		});
		return failure(errorCode);
	}
}
