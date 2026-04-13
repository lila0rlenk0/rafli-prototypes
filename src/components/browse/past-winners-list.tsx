'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
	PastWinnersGroup,
	type PastWinnersGroupVariant,
} from '@/components/browse/past-winners-group';
import { Spinner } from '@/components/ui/spinner';
import { usePastWinners } from '@/services/winning/use-past-winners';
import type { ListPastWinnersResponse, RecentWinner } from '@/types/winning';

interface PastWinnersListProps {
	initialData: ListPastWinnersResponse;
}

/**
 * Variant rotation order — blue → green → yellow mirrors the decorative-shape
 * stacking in every public layout, so scrolling the archive echoes the
 * background palette the reader has already been conditioned to expect.
 */
const GROUP_VARIANTS: readonly PastWinnersGroupVariant[] = [
	'blue',
	'green',
	'yellow',
] as const;

/**
 * Per-raffle aggregation of the flat winners feed.
 * Only used inside this file — promote to `@/types/winning` if another
 * surface ever needs the same shape.
 */
interface RaffleWinnersGroup {
	raffleId: string;
	raffleSlug: string;
	raffleTitle: string;
	drawnAt: string;
	winners: RecentWinner[];
}

/**
 * Folds the accumulated flat winners array (across infinite-query pages)
 * into per-raffle groups, preserving the backend's most-recent-first order
 * and sorting winners within each group by position ascending so the grand
 * prize (position 1) always leads.
 *
 * Why a Map: insertion order matters — the first page where a raffle appears
 * locks that group's position in the output. Map makes the intent explicit
 * and avoids relying on object-key-order guarantees.
 *
 * Safe to re-run on every render because React Query keeps the pages array
 * referentially stable between fetches — `useMemo` in the consumer prevents
 * needless re-walks when the winners array identity hasn't changed.
 */
function groupWinnersByRaffle(
	winners: readonly RecentWinner[],
): readonly RaffleWinnersGroup[] {
	const groups = new Map<string, RaffleWinnersGroup>();

	for (const winner of winners) {
		const existing = groups.get(winner.raffleId);
		if (existing) {
			existing.winners.push(winner);
			continue;
		}
		groups.set(winner.raffleId, {
			raffleId: winner.raffleId,
			raffleSlug: winner.raffleSlug,
			raffleTitle: winner.raffleTitle,
			drawnAt: winner.wonAt,
			winners: [winner],
		});
	}

	return Array.from(groups.values()).map(group => ({
		...group,
		// `.toSorted()` returns a new array per the data rule — don't mutate
		// the Map's internal winners array since React Query may snapshot it.
		winners: group.winners.toSorted((a, b) => a.position - b.position),
	}));
}

/**
 * Infinite-scroll archive list for /past-winners.
 *
 * Hydrates React Query with a server-fetched page 1 (via `initialData`) so
 * there's no loading flicker on first paint. Subsequent pages load
 * automatically when the bottom sentinel scrolls into view.
 *
 * Grouping is applied across ALL accumulated pages — a raffle whose winners
 * span a page boundary (e.g., positions 1–3 on page 1, position 4 on page 2)
 * still collapses into a single `PastWinnersGroup` once both pages are
 * loaded. This is why grouping lives client-side: it needs the full
 * accumulated array, not per-page slices.
 */
export function PastWinnersList({ initialData }: PastWinnersListProps) {
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		usePastWinners({ initialData });

	/**
	 * Flatten pages then group by raffle. Both steps memoized on the pages
	 * array identity — React Query keeps `data.pages` stable across renders
	 * that don't change the cache, so the derived groups array is stable too
	 * (preventing needless `PastWinnersGroup` re-renders down the tree).
	 */
	const groups = useMemo(() => {
		if (!data) return [];
		const flattened = data.pages.flatMap(page => page.winners);
		return groupWinnersByRaffle(flattened);
	}, [data]);

	/**
	 * IntersectionObserver sentinel — fires `fetchNextPage()` when the loader
	 * row scrolls within `rootMargin: 400px` of the viewport, so the next page
	 * is already loading by the time the user reaches it. Generous rootMargin
	 * trades a bit of prefetch for a seamless-feeling scroll.
	 *
	 * Why a ref + effect rather than a declarative library: adding a hook
	 * dependency (e.g. react-intersection-observer) just to toggle one
	 * boolean isn't worth the bundle weight for this single consumer.
	 */
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// mount: bind IntersectionObserver to the sentinel. Legit useEffect —
		// browser API subscription, cleanup on unmount or dep change.
		if (!hasNextPage) return;
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			function onIntersect(entries) {
				const [entry] = entries;
				// Skip if sentinel scrolled out of view OR a fetch is already in
				// flight — prevents stacking multiple concurrent page fetches
				// when the user scrolls rapidly past the threshold.
				if (!entry?.isIntersecting || isFetchingNextPage) return;
				void fetchNextPage();
			},
			{
				// 400px early-trigger — start loading page N+1 before the user
				// reaches the end of page N, so perceived latency is near-zero
				// on typical scroll speeds.
				rootMargin: '400px',
			},
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (groups.length === 0) {
		return (
			/* Empty-state styling intentionally matches the /browse "No raffles
			   found" block so both pages share the same voice. */
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<h3 className="text-xl font-semibold text-gray-900">No winners yet</h3>
				<p className="mt-2 text-gray-500">
					Check back after the next draw concludes.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-col gap-8 sm:gap-10">
				{groups.map((group, index) => (
					<PastWinnersGroup
						key={group.raffleId}
						raffleTitle={group.raffleTitle}
						raffleSlug={group.raffleSlug}
						drawnAt={group.drawnAt}
						winners={group.winners}
						/* Variant rotation is index-based so the palette stays
						   deterministic across re-renders. Works across pages too:
						   as new groups append from subsequent fetches their index
						   continues the sequence. */
						variant={GROUP_VARIANTS[index % GROUP_VARIANTS.length]}
					/>
				))}
			</div>

			{/* Sentinel + loader — rendered only while more pages remain. The
			    sentinel is always a sibling of the last group so IntersectionObserver
			    sees it immediately after the user scrolls past the final card. The
			    empty div between fetches keeps the observer target in the layout
			    without any visual or SR noise. */}
			{hasNextPage ? (
				<div ref={sentinelRef} className="mt-10 flex justify-center py-4">
					{isFetchingNextPage ? (
						<>
							<Spinner aria-hidden="true" className="size-6" />
							{/* `role="status"` + `aria-live="polite"` so SR users get
							   a non-interrupting announcement as each subsequent page
							   streams in — visually the spinner carries the same signal
							   for sighted users. */}
							<span className="sr-only" role="status" aria-live="polite">
								Loading more winners…
							</span>
						</>
					) : null}
				</div>
			) : null}
		</>
	);
}
