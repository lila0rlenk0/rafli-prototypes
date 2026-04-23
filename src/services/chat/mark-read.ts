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
import { type MarkReadResponse, markReadResponseSchema } from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Marks a conversation as read up to a specific message.
 *
 * The backend interprets `messageId` as the watermark — every earlier
 * message in the conversation is implicitly read. We never mark on behalf
 * of another user: the backend resolves the actor from the JWT, so a
 * tampered conversationId still gets rejected with `not-member`.
 *
 * @param conversationId - UUID of the conversation.
 * @param messageId - UUID of the latest visible message.
 * @returns ServiceResponse acknowledging the write on success.
 */
export async function markRead(
	conversationId: string,
	messageId: string,
): Promise<ServiceResponse<MarkReadResponse, ChatErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/chat/conversations/${pathParam(conversationId)}/read`,
			{ messageId },
		);
		return success(markReadResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'mark-read');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'mark-read',
		});
		return failure(errorCode);
	}
}
