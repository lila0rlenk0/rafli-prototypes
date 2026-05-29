import { Goal, ServerCrash, Ticket } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { FulfillmentBadge } from '@/components/raffle/badges/fulfillment-badge';
import {
	FRAME_ENTRANCE_CLASS,
	STAGE_ENTRANCE_CLASS,
} from '@/components/raffle/motion-classes';
import { cn } from '@/lib/class-names';
import { RAFFLE_STATUS, type RaffleStatus } from '@/types/raffle';

// Loser-side shake — matches the reveal-modal LoserFrame so the
// post-dialog static card lands with a gentler wobble than the winner.
const NOT_WON_SHAKE_STYLE: CSSProperties = {
	'--card-shake-deg': '3deg',
} as CSSProperties;

interface RaffleNotWonCardProps {
	/** Current raffle status */
	status: RaffleStatus;
	/** Raffle public slug — used to build the entry-codes table URL */
	publicSlug: string;
	/**
	 * Total entries the current user owns for this raffle.
	 * When greater than 0 we surface a link to the full entry-codes table so
	 * non-winners can still review what they bought — addresses the gap where
	 * concluded raffles previously hid all entry information from losers.
	 */
	myTicketsTotal: number;
}

/**
 * RaffleNotWonCard Component
 *
 * Displayed to users who participated in a concluded raffle but did not win.
 * Shows different messages based on raffle status, and — for users who bought
 * at least one entry — a CTA that links to the dedicated entry-codes table
 * at /browse/{publicSlug}/ticket-ids.
 */
export function RaffleNotWonCard({
	status,
	publicSlug,
	myTicketsTotal,
}: RaffleNotWonCardProps) {
	function getMessage(): string {
		switch (status) {
			case RAFFLE_STATUS.FULFILLING:
				return 'The results are being processed...';
			case RAFFLE_STATUS.COMPLETED:
				return 'The sweepstakes is complete!';
			default:
				return 'The sweepstakes has ended!';
		}
	}

	const isFulfilling = status === RAFFLE_STATUS.FULFILLING;
	const Icon = isFulfilling ? ServerCrash : Goal;
	// Guard the CTA: guests or users without entries see nothing here.
	const hasTickets = myTicketsTotal > 0;
	// English pluralization — avoids awkward "1 entries" copy.
	const entryWord = myTicketsTotal === 1 ? 'entry' : 'entries';

	return (
		<div
			className={cn(
				'rounded-2xl border border-black bg-white px-16 py-8',
				FRAME_ENTRANCE_CLASS,
			)}
		>
			<div
				aria-hidden
				style={NOT_WON_SHAKE_STYLE}
				className="motion-safe:animate-card-pop mx-auto w-fit"
			>
				<Icon className="size-12" />
			</div>

			<h2
				className={cn(
					'font-clash-display mt-8 text-center text-2xl font-semibold',
					STAGE_ENTRANCE_CLASS,
					'motion-safe:delay-400',
				)}
			>
				{getMessage()}
			</h2>

			{!isFulfilling ? (
				<div
					className={cn('mt-4', STAGE_ENTRANCE_CLASS, 'motion-safe:delay-500')}
				>
					<FulfillmentBadge />
				</div>
			) : null}

			{/*
			 * Entry-codes CTA — rendered regardless of status as long as the
			 * user actually has entries. Losers still need to see their codes
			 * to cross-reference them against /verify or the How It Works page.
			 */}
			{hasTickets ? (
				<Link
					href={`/browse/${publicSlug}/ticket-ids`}
					className={cn(
						'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold transition-colors hover:bg-black hover:text-white',
						STAGE_ENTRANCE_CLASS,
						'motion-safe:delay-700',
					)}
				>
					<Ticket className="size-4" />
					View your {myTicketsTotal.toLocaleString('en-US')} {entryWord}
				</Link>
			) : null}

			{isFulfilling ? (
				<Link
					href="/how-it-works"
					className={cn(
						'mt-4 block text-center text-sm text-gray-600 underline hover:text-black',
						STAGE_ENTRANCE_CLASS,
						'motion-safe:delay-700',
					)}
				>
					Learn how it works
				</Link>
			) : null}
		</div>
	);
}
