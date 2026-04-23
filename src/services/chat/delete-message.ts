'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { pathParam } from '@/lib/utils/routing/path-param';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import { type Message, messageSchema } from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Soft-deletes a message. Authorship and conversation-admin privileges
 * are enforced on the backend — the UI offers the control based on the
 * member role returned in the conversation payload, but a tampered call
 * still fails with `chat:message:permission-denied`.
 *
 * Soft delete preserves the message row with `deletedAt` set; callers are
 * expected to render a "Message removed" placeholder rather than the body
 * (the backend also scrubs the body from the returned payload).
 *
 * @param messageId - UUID of the message to delete.
 * @returns ServiceResponse with the tombstoned message on success.
 */
export async function deleteMessage(
	messageId: string,
): Promise<ServiceResponse<Message, ChatErrorCode>> {
	try {
		const response = await authenticatedClient.delete(
			`/chat/messages/${pathParam(messageId)}`,
		);
		return success(messageSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'delete-message');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'delete-message',
		});
		return failure(errorCode);
	}
}
