'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { serviceError } from '@/lib/query/errors';
import type { CommentSort } from '@/types/comment';

import { getComments } from './get-comments';
import { getMyComments } from './get-my-comments';

/** Default page size for comment pagination */
const COMMENTS_PAGE_SIZE = 10;

/** Query key for top-level comments */
export function commentsKey(raffleId: string, sort: CommentSort) {
	return ['comment', 'list', raffleId, sort] as const;
}

/**
 * Infinite query hook for top-level comments
 *
 * Auth-aware: uses /me/ endpoint when authenticated to get userVote enrichment,
 * falls back to public endpoint otherwise.
 * First "load more" pattern in codebase — accumulates pages via useInfiniteQuery.
 *
 * @param options - Query options
 * @returns React Query infinite query result
 */
export function useComments(options: {
	raffleId: string;
	sort: CommentSort;
	isAuthenticated: boolean;
}) {
	return useInfiniteQuery({
		queryKey: commentsKey(options.raffleId, options.sort),
		queryFn: async function fetchComments({ pageParam }) {
			// Step 1: Choose endpoint based on auth state
			//         Authenticated users get userVote on each comment
			const fetcher = options.isAuthenticated ? getMyComments : getComments;

			// Step 2: Fetch page
			const result = await fetcher(options.raffleId, {
				page: pageParam,
				limit: COMMENTS_PAGE_SIZE,
				sort: options.sort,
			});

			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		initialPageParam: 1,
		getNextPageParam: function getNext(lastPage) {
			// Page-based pagination — stop when on last page
			if (lastPage.page >= lastPage.totalPages) return undefined;
			return lastPage.page + 1;
		},
	});
}
