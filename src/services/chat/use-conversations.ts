'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ChatErrorCode } from '@/types/errors';
import type { ConversationListResponse } from '@/types/chat';

import { getConversations } from './get-conversations';
import { conversationsKey } from './query-keys';

/**
 * Cursor-paginated list of the caller's conversations. Uses UUIDv7 tails as
 * cursors per backend convention — we derive the next cursor from the last
 * item's id rather than trusting a dedicated field, because the backend
 * response only carries `hasMore`.
 *
 * Default `staleTime: Infinity` matches project-wide React Query config;
 * WS message/presence events invalidate this key to refresh.
 *
 * @param options - Page size (default 20, max 50 per backend).
 * @returns React Query infinite result with pages of conversations.
 */
export function useConversations(options?: { limit?: number }) {
	const limit = options?.limit ?? 20;

	return useInfiniteQuery<
		ConversationListResponse,
		ServiceError<ChatErrorCode>
	>({
		queryKey: conversationsKey(),
		initialPageParam: undefined,
		queryFn: async function fetchConversationsPage({ pageParam }) {
			const result = await getConversations({
				cursor: pageParam as string | undefined,
				limit,
			});
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		getNextPageParam(lastPage) {
			// Cursor = last visible conversation id. Undefined ends pagination.
			if (!lastPage.hasMore || lastPage.conversations.length === 0) {
				return undefined;
			}
			return lastPage.conversations[lastPage.conversations.length - 1].id;
		},
	});
}
