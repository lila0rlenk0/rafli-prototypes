'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ChatErrorCode } from '@/types/errors';
import type { MessageListResponse } from '@/types/chat';

import { getMessages } from './get-messages';
import { messagesKey } from './query-keys';

/**
 * Cursor-paginated message history for a conversation (newest first).
 *
 * `enabled` is the consumer's kill-switch: the conversation view only
 * opts-in once it has a validated conversationId — this prevents the hook
 * from firing with an empty string during route transitions.
 *
 * @param conversationId - UUID of the conversation. Empty string disables the query.
 * @param options - Page size (default 20, max 50 per backend).
 * @returns React Query infinite result with pages of messages.
 */
export function useMessages(
	conversationId: string,
	options?: { limit?: number },
) {
	const limit = options?.limit ?? 20;

	return useInfiniteQuery<MessageListResponse, ServiceError<ChatErrorCode>>({
		queryKey: messagesKey(conversationId),
		initialPageParam: undefined,
		enabled: conversationId.length > 0,
		queryFn: async function fetchMessagesPage({ pageParam }) {
			const result = await getMessages(conversationId, {
				cursor: pageParam as string | undefined,
				limit,
			});
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		getNextPageParam(lastPage) {
			// Cursor = last visible message id. Undefined ends pagination.
			if (!lastPage.hasMore || lastPage.messages.length === 0) {
				return undefined;
			}
			return lastPage.messages[lastPage.messages.length - 1].id;
		},
	});
}
