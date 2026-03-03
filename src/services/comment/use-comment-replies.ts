'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { serviceError } from '@/lib/query/errors';

import { getCommentReplies } from './get-comment-replies';
import { getMyCommentReplies } from './get-my-comment-replies';

/** Default page size for reply pagination */
const REPLIES_PAGE_SIZE = 10;

/** Query key for comment replies */
export function commentRepliesKey(commentId: string) {
	return ['comment', 'replies', commentId] as const;
}

/**
 * Infinite query hook for comment replies
 *
 * Disabled by default — toggled on when user clicks "View N replies".
 * Auth-aware: uses /me/ endpoint when authenticated for userVote enrichment.
 *
 * @param options - Query options
 * @returns React Query infinite query result
 */
export function useCommentReplies(options: {
	raffleId: string;
	commentId: string;
	isAuthenticated: boolean;
	enabled?: boolean;
}) {
	return useInfiniteQuery({
		queryKey: commentRepliesKey(options.commentId),
		queryFn: async function fetchReplies({ pageParam }) {
			// Step 1: Choose endpoint based on auth state
			const fetcher = options.isAuthenticated
				? getMyCommentReplies
				: getCommentReplies;

			// Step 2: Fetch page — replies don't need sort (always chronological)
			const result = await fetcher(options.raffleId, options.commentId, {
				page: pageParam,
				limit: REPLIES_PAGE_SIZE,
			});

			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		initialPageParam: 1,
		getNextPageParam: function getNext(lastPage) {
			if (lastPage.page >= lastPage.totalPages) return undefined;
			return lastPage.page + 1;
		},
		enabled: options.enabled ?? false,
	});
}
