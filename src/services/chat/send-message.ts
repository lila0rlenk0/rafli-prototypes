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
import {
	type Message,
	messageSchema,
	type SendMessageInput,
	sendMessageInputSchema,
} from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Sends a message via REST (fallback path — the WebSocket stream is primary).
 *
 * Input is re-parsed through Zod with `strict()`-equivalent keys via
 * `sendMessageInputSchema` so an unknown field cannot slip into the outbound
 * payload (mass-assignment defence). Body length mirrors the backend
 * limit (min 1, max 4000) — rejections happen before the request.
 *
 * @param conversationId - UUID of the conversation.
 * @param input - Message payload (body, optional msgType, optional attachmentId).
 * @returns ServiceResponse with the persisted message on success.
 */
export async function sendMessage(
	conversationId: string,
	input: SendMessageInput,
): Promise<ServiceResponse<Message, ChatErrorCode>> {
	// Step 1: Validate input locally. safeParse instead of parse so a bad
	// caller payload becomes a mapped MESSAGE_INVALID_BODY rather than a thrown
	// exception — keeps the happy-path contract uniform with other services.
	const validated = sendMessageInputSchema.safeParse(input);
	if (!validated.success) {
		return failure(CHAT_ERROR_CODES.MESSAGE_INVALID_BODY);
	}

	try {
		const response = await authenticatedClient.post(
			`/chat/conversations/${pathParam(conversationId)}/messages`,
			validated.data,
		);
		return success(messageSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'send-message');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'send-message',
		});
		return failure(errorCode);
	}
}
