'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/query-params';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { pathParam } from '@/lib/utils/routing/path-param';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import {
	type ChatPaginationQuery,
	type MessageListResponse,
	messageListResponseSchema,
} from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches paginated history for a conversation (newest first via cursor).
 *
 * The cursor is opaque — we pass it through without touching its contents so
 * an attacker cannot craft a cursor from another conversation. Membership
 * is checked server-side; non-members receive `chat:conversation:not-member`.
 *
 * @param conversationId - UUID of the conversation.
 * @param query - Optional pagination (cursor, limit ≤ 50 per backend).
 * @returns ServiceResponse with the message page on success.
 */
export async function getMessages(
	conversationId: string,
	query?: ChatPaginationQuery,
): Promise<ServiceResponse<MessageListResponse, ChatErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/chat/conversations/${pathParam(conversationId)}/messages`,
			{ params: buildQueryParams(query) },
		);
		return success(messageListResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'get-messages');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'get-messages',
		});
		return failure(errorCode);
	}
}
