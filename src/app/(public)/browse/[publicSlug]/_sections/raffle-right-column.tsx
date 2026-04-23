import { InfoIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { PromoCodesCard } from '@/components/browse/public-slug/promo-codes-card';
import { RaffleAutoRefresh } from '@/components/raffle/countdown/auto-refresh';
import { RaffleDrawWithRefresh } from '@/components/raffle/cards/draw-with-refresh';
import type { Raffle } from '@/types/raffle';

import type { RaffleViewState } from './raffle-page-derived';

interface RaffleRightColumnProps {
	raffle: Raffle;
	publicSlug: string;
	view: RaffleViewState;
	/**
	 * User-specific right-column content — winner card, host fulfillment,
	 * cancelled / not-won, the active-card with TicketPurchaseCard, the
	 * WinnersList, and the RaffleInfoCard. Fed by the page as a
	 * `<Suspense>`-wrapped async child so the non-user chrome below it can
	 * stream first.
	 */
	userAsyncSlot: ReactNode;
}

/**
 * Right column of the public raffle page — renders only the non-user chrome
 * (draw-in-progress poller, promo codes card, KYC notice, auto-refresh
 * poller). The user-specific cards — winner state, host fulfillment, the
 * active card with purchase UI, winners list, and user-aware raffle info —
 * stack above this tree via `userAsyncSlot`, which the page wraps in a
 * `<Suspense>` boundary so the JWT decode and per-user fetches don't block
 * first paint of this shell.
 *
 * @returns The non-user right-column server component
 */
export function RaffleRightColumn({
	raffle,
	publicSlug,
	view,
	userAsyncSlot,
}: RaffleRightColumnProps) {
	const {
		isOwner,
		isPromoManageable,
		showDrawInProgress,
		showKycNotice,
		hasWinners,
	} = view;

	// Auto-refresh polls the raffle while status is transitional. Skipped
	// while the draw is in progress — that surface has its own poller baked
	// into `RaffleDrawWithRefresh` so we'd otherwise double-poll.
	const showAutoRefresh = !showDrawInProgress;

	return (
		<div className="order-2 flex flex-col gap-2 lg:col-start-2">
			{userAsyncSlot}

			{showDrawInProgress ? (
				<RaffleDrawWithRefresh
					status={raffle.status}
					endAt={raffle.endAt}
					hasWinners={hasWinners}
				/>
			) : null}

			<PromoCodesCard
				publicSlug={publicSlug}
				isOwner={isOwner}
				isManageable={isPromoManageable}
			/>

			{showKycNotice ? <RaffleKycNotice /> : null}

			{showAutoRefresh ? (
				<RaffleAutoRefresh
					status={raffle.status}
					endAt={raffle.endAt}
					hasWinners={hasWinners}
				/>
			) : null}
		</div>
	);
}

/** Small informational row reminding participants KYC is only required on win. */
function RaffleKycNotice() {
	return (
		<div className="hidden items-center justify-center gap-2 lg:flex">
			<InfoIcon className="text-ink-500 size-4" />
			<p className="text-ink-500 text-sm">
				You&apos;ll only need KYC if you win
			</p>
		</div>
	);
}
