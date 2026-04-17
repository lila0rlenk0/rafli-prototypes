'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ChatErrorCode } from '@/types/errors';
import type {
	ConversationFilter,
	ConversationListResponse,
	ConversationSort,
} from '@/types/chat';

import { getConversations } from './get-conversations';
import { conversationsListKey } from './query-keys';

export interface UseConversationsOptions {
	readonly limit?: number;
	/** Free-text search forwarded to the backend — scoped by `q` param. */
	readonly q?: string;
	/** Filter chip — forwarded to the backend as the `filter` param. */
	readonly filter?: ConversationFilter;
	/** Sort mode — forwarded to the backend as the `sort` param. */
	readonly sort?: ConversationSort;
}

/**
 * Cursor-paginated list of the caller's conversations. Filter, search and
 * sort are server-driven (the client never slices the page after fetch — see
 * `services.md`) so the hook forwards the params through to the server action
 * and includes them in the query key.
 *
 * Default `staleTime: Infinity` matches project-wide React Query config;
 * WS message/presence events invalidate the `chat/conversations/list` prefix
 * to refresh every cached permutation.
 */
export function useConversations(options: UseConversationsOptions = {}) {
	const { limit = 20, q, filter, sort } = options;

	return useInfiniteQuery<
		ConversationListResponse,
		ServiceError<ChatErrorCode>
	>({
		queryKey: conversationsListKey({ q, filter, sort }),
		initialPageParam: undefined,
		queryFn: async function fetchConversationsPage({ pageParam }) {
			const result = await getConversations({
				cursor: pageParam as string | undefined,
				limit,
				q,
				filter,
				sort,
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
