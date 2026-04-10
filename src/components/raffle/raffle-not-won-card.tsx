import { Goal, ServerCrash, Ticket } from 'lucide-react';
import Link from 'next/link';

import { FulfillmentBadge } from '@/components/raffle/fulfillment-badge';
import { RAFFLE_STATUS, type RaffleStatus } from '@/types/raffle';

interface RaffleNotWonCardProps {
	/** Current raffle status */
	status: RaffleStatus;
	/** Raffle public slug — used to build the ticket-codes table URL */
	publicSlug: string;
	/**
	 * Total tickets the current user owns for this raffle.
	 * When greater than 0 we surface a link to the full ticket-codes table so
	 * non-winners can still review what they bought — addresses the gap where
	 * concluded raffles previously hid all ticket information from losers.
	 */
	myTicketsTotal: number;
}

/**
 * RaffleNotWonCard Component
 *
 * Displayed to users who participated in a concluded raffle but did not win.
 * Shows different messages based on raffle status, and — for users who bought
 * at least one ticket — a CTA that links to the dedicated ticket-codes table
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
				return 'The raffle is complete!';
			default:
				return 'The raffle has ended!';
		}
	}

	const isFulfilling = status === RAFFLE_STATUS.FULFILLING;
	const Icon = isFulfilling ? ServerCrash : Goal;
	// Guard the CTA: guests or users without tickets see nothing here.
	const hasTickets = myTicketsTotal > 0;
	// English pluralization — avoids awkward "1 tickets" copy.
	const ticketWord = myTicketsTotal === 1 ? 'ticket' : 'tickets';

	return (
		<div className="rounded-2xl border border-black bg-white px-16 py-8">
			<Icon className="mx-auto size-12" />

			<h2 className="font-clash-display mt-8 text-center text-2xl font-semibold">
				{getMessage()}
			</h2>

			{!isFulfilling ? (
				<div className="mt-4">
					<FulfillmentBadge />
				</div>
			) : null}

			{/*
			 * Ticket-codes CTA — rendered regardless of status as long as the
			 * user actually has tickets. Losers still need to see their codes
			 * to cross-reference them against /verify or the How It Works page.
			 */}
			{hasTickets ? (
				<Link
					href={`/browse/${publicSlug}/ticket-ids`}
					className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold transition-colors hover:bg-black hover:text-white"
				>
					<Ticket className="size-4" />
					View your {myTicketsTotal.toLocaleString('en-US')} {ticketWord}
				</Link>
			) : null}

			{isFulfilling ? (
				<Link
					href="/how-it-works"
					className="mt-4 block text-center text-sm text-gray-600 underline hover:text-black"
				>
					Learn how it works
				</Link>
			) : null}
		</div>
	);
}
