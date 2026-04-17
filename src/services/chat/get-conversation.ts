'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import { type Conversation, conversationSchema } from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches a single conversation by ID. Returns 404 `chat:conversation:not-found`
 * for unknown IDs and 403 `chat:conversation:not-member` for IDs the caller
 * is not a member of — both are leveraged by the deep-link page to render
 * `notFound()` without leaking which conversations exist.
 *
 * @param conversationId - UUID of the conversation to load.
 * @returns ServiceResponse with the conversation on success.
 */
export async function getConversation(
	conversationId: string,
): Promise<ServiceResponse<Conversation, ChatErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/chat/conversations/${conversationId}`,
		);
		return success(conversationSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'get-conversation');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'get-conversation',
		});
		return failure(errorCode);
	}
}
