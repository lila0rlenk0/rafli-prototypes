'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ConversationCountsResponse } from '@/types/chat';
import type { ChatErrorCode } from '@/types/errors';

import { getConversationCounts } from './get-conversation-counts';
import { conversationCountsKey } from './query-keys';

/**
 * Sidebar filter-chip counts. Shares the active `q` with the list hook so
 * badges reflect what each tab would return for the current search.
 *
 * `placeholderData: keepPreviousData` keeps the last successful value while
 * a new query runs — the badges don't flicker to 0 while the user types.
 */
export function useConversationCounts(options: { q?: string } = {}) {
	const { q } = options;

	return useQuery<ConversationCountsResponse, ServiceError<ChatErrorCode>>({
		queryKey: conversationCountsKey({ q }),
		queryFn: async function fetchConversationCounts() {
			const result = await getConversationCounts({ q });
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		placeholderData: keepPreviousData,
	});
}
