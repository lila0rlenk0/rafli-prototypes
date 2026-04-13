import Link from 'next/link';

import { BugIcon } from '@/assets/icons/bug-icon';
import { PastWinnersList } from '@/components/browse/past-winners-list';
import { getPastWinners } from '@/services/winning/get-past-winners';
import { PAST_WINNERS_PAGE_SIZE } from '@/services/winning/use-past-winners';

/**
 * Past Winners Archive
 *
 * Server Component — renders the editorial hero + error boundary, then hands
 * off to the client `PastWinnersList` for infinite-scroll pagination.
 *
 * Data flow:
 * 1. Server fetches page 1 via `getPastWinners` for SSR (no client loading
 *    flicker on first paint, SEO gets rendered content).
 * 2. `PastWinnersList` hydrates React Query with that payload as
 *    `initialData`; subsequent pages load client-side when the bottom
 *    sentinel enters the viewport.
 *
 * Privacy: every winner arrives pre-masked ("First L." or "Deleted User")
 * from the /winnings/past endpoint. No userId ever touches the wire;
 * client-side grouping only keys by raffleId (public identifier used in URLs).
 */
export default async function PastWinnersPage() {
	// Page 1 fetched server-side for SSR. `PAST_WINNERS_PAGE_SIZE` is shared
	// with the client hook so server+client agree on the page size — diverging
	// would cause React Query to consider the seeded page "incomplete" and
	// fire an unnecessary refetch on mount.
	const response = await getPastWinners({
		page: 1,
		limit: PAST_WINNERS_PAGE_SIZE,
	});

	if (!response.success) {
		return (
			<div className="flex h-[50vh] w-full flex-col items-center justify-center gap-10 px-4 text-center">
				<BugIcon />
				<hgroup className="space-y-4">
					<h2 className="text-xl font-semibold">Error loading past winners</h2>
					<p className="mt-2 text-lg">
						Something went wrong while loading the winners list. Please try
						again later.
					</p>
				</hgroup>
				<Link
					href="/browse"
					className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
				>
					Back to Browse
				</Link>
			</div>
		);
	}

	return (
		/* No outer width container — `PublicNavbar` already wraps children in
		   `mx-auto max-w-[1920px]` with responsive horizontal padding. Vertical
		   rhythm matches /browse (`pt-0 pb-8 sm:py-8`) so navigating between the
		   two pages feels continuous. */
		<div className="z-10 pt-0 pb-8 sm:py-8">
			{/* Inner editorial column — constrained because the grouped cards are
			    typography-forward and very wide measures make the winner-row scan
			    tiring. Hero sits in the same column so the eye has one consistent
			    gutter to anchor on when scrolling the archive. */}
			<div className="mx-auto max-w-4xl">
				<header className="mb-10 flex flex-col gap-4 sm:mb-16">
					<p className="text-sm font-normal text-[rgba(15,15,15,0.95)] sm:text-base sm:font-medium">
						Every draw verified on-chain. Names masked for privacy.
					</p>
					<h1 className="font-clash-display text-[40px] leading-none font-semibold tracking-[0.4px] sm:text-[64px] sm:tracking-normal">
						Past winners
					</h1>
				</header>

				<PastWinnersList initialData={response.data} />
			</div>
		</div>
	);
}
