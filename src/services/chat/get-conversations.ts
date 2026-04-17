'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import {
	type ConversationListResponse,
	conversationListResponseSchema,
	type ConversationsListQuery,
} from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Lists the caller's active chat conversations (cursor-paginated).
 *
 * Authorization is enforced by the backend — only conversations the caller
 * is a member of come back, so even a tampered client can't enumerate IDs
 * it shouldn't see. `hasMore` + opaque `cursor` drive React Query's
 * `useInfiniteQuery`; we never reconstruct cursor shape client-side.
 *
 * Server-side filter/search/sort: `q`, `filter`, `sort` are forwarded as-is.
 * The client never slices the page after the fact — doing so would produce
 * inconsistent page sizes and break keyset pagination.
 *
 * @param query - Optional pagination + filter/search/sort.
 * @returns ServiceResponse with the conversation page on success.
 */
export async function getConversations(
	query?: ConversationsListQuery,
): Promise<ServiceResponse<ConversationListResponse, ChatErrorCode>> {
	try {
		const response = await authenticatedClient.get('/chat/conversations', {
			params: buildQueryParams(query),
		});
		return success(conversationListResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'get-conversations');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'get-conversations',
		});
		return failure(errorCode);
	}
}
