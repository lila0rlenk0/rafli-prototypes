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
 * Refetch policy — narrow override of the global `staleTime: Infinity`
 * default (`@/lib/query/client`). The chat surface is the only place where
 * server-derived state (winning status) is reconstructed from cached
 * messages on the client, so a stale messages cache silently produces a
 * stale prize-shipment stepper. Concretely: a host re-entering a winner
 * chat after the WS missed a `shipment_update` push (laptop sleep,
 * silently-dead socket, partial reconnect) would otherwise read the cached
 * pages indefinitely and see "Mark as sent" long after the winner already
 * confirmed receipt. Forcing a refetch on mount + on browser reconnect
 * heals both that drift and the symptom of an empty-looking conversation
 * served from a stale cache snapshot taken before any messages existed.
 * `'always'` (not `true`) is required because `staleTime: Infinity` would
 * otherwise short-circuit the refetch as "still fresh".
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
		// Override the global "fetch once, serve from cache" defaults — the
		// derived shipment status must reflect the latest server truth on
		// every (re-)mount, not whatever the WS happened to push earlier.
		refetchOnMount: 'always',
		refetchOnReconnect: 'always',
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
