'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { serviceError } from '@/lib/query/errors';
import type { ListPastWinnersResponse } from '@/types/winning';

import { getPastWinners } from './get-past-winners';
import { PAST_WINNERS_PAGE_SIZE } from './past-winners-config';

/** React Query key for the past winners archive — single global list. */
export function pastWinnersKey() {
	return ['winning', 'past'] as const;
}

/**
 * Infinite query hook for the /past-winners archive.
 *
 * Follows the same pattern as `useComments` — `useInfiniteQuery` with
 * page-based pagination and `getNextPageParam` returning `undefined` on
 * the last page to stop further fetches.
 *
 * `initialData` plumbs a server-fetched page 1 into React Query so the
 * page renders the first 20 winners immediately on first paint without
 * a client loading flicker. Subsequent pages are fetched client-side
 * via the intersection-observer sentinel in `PastWinnersList`.
 *
 * @param options.initialData - Server-fetched page 1 payload for SSR hydration.
 */
export function usePastWinners(options?: {
	initialData?: ListPastWinnersResponse;
}) {
	return useInfiniteQuery({
		queryKey: pastWinnersKey(),
		queryFn: async function fetchPastWinners({ pageParam }) {
			const result = await getPastWinners({
				page: pageParam,
				limit: PAST_WINNERS_PAGE_SIZE,
			});
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		initialPageParam: 1,
		getNextPageParam: function getNext(lastPage) {
			// Page-based pagination — stop when we've reached the last page.
			// `lastPage.page` is 1-indexed, `totalPages` is the final page
			// number so strict `>=` gates the terminal page correctly.
			if (lastPage.page >= lastPage.totalPages) return undefined;
			return lastPage.page + 1;
		},
		// Seed the cache with the server-rendered first page so the initial
		// client render doesn't re-fetch data the server already resolved.
		// `pageParams: [1]` tells React Query that the seeded page corresponds
		// to `pageParam = 1`, so `getNextPageParam` correctly computes page 2.
		initialData: options?.initialData
			? {
					pages: [options.initialData],
					pageParams: [1],
				}
			: undefined,
	});
}
