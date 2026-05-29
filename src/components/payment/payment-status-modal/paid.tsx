'use client';

import Link from 'next/link';

import { EntriesConfirmedBody } from '@/components/raffle/ticket-purchase/entries-confirmed-body';
import { Button } from '@/components/ui/button';

interface PaymentStatusPaidProps {
	publicSlug: string;
	raffleTitle: string;
	/** Hosts viewing their own raffle on Stripe redirect-back don't see the
	 * participant deep-link — the body branches on this. */
	isParticipant: boolean;
	/** Quantity from the just-paid order. */
	ticketQuantity?: number;
	/**
	 * Final "Your Entries" total — the page already re-rendered after the
	 * Stripe redirect, so the page-level value reflects the post-purchase
	 * count (assuming Stripe webhook landed before the user's redirect, which
	 * is the common case). The body snapshots on mount so any later refetch
	 * can't shift the number mid-celebration.
	 */
	yourEntries?: number;
	/** Final "Total in Pool" — same source/snapshot semantics as `yourEntries`. */
	totalInPool?: number;
}

/**
 * Stripe-return success state. Renders the same `EntriesConfirmedBody` as
 * the in-page credits/free-tickets flow so the confirmation moment is
 * visually identical across tender paths.
 *
 * Hosts who land here on Stripe redirect (rare, but possible if they bought
 * into their own sweepstakes from a different surface) skip the participant
 * deep-link via `isParticipant=false`; the body falls back to a
 * "Back to sweepstakes" CTA.
 *
 * @returns Tier-keyed celebration body — outer Dialog/DialogContent shell
 *   lives on `PaymentStatusModal`
 */
export function PaymentStatusPaid({
	publicSlug,
	raffleTitle,
	isParticipant,
	ticketQuantity,
	yourEntries,
	totalInPool,
}: PaymentStatusPaidProps) {
	if (
		ticketQuantity === undefined ||
		yourEntries === undefined ||
		totalInPool === undefined
	) {
		return (
			<PaymentStatusPaidFallback
				publicSlug={publicSlug}
				isParticipant={isParticipant}
			/>
		);
	}

	return (
		<EntriesConfirmedBody
			publicSlug={publicSlug}
			raffleTitle={raffleTitle}
			ticketQuantity={ticketQuantity}
			yourEntries={yourEntries}
			totalInPool={totalInPool}
			// Stripe-return CTA target — `/my-raffles` (not the per-raffle
			// deep-link) because the participant may have entered multiple
			// raffles in one Stripe session and the list view is the
			// universal landing.
			participantHrefBase="/my-raffles"
			isParticipant={isParticipant}
		/>
	);
}

interface PaymentStatusPaidFallbackProps {
	publicSlug: string;
	isParticipant: boolean;
}

/**
 * Verified-paid fallback for the rare case where Stripe verification succeeds
 * but the follow-up stats fetch fails. Keeps payment truth intact: never show
 * unpaid copy after the backend has already confirmed the charge.
 *
 * @returns Paid confirmation without entry stats
 */
function PaymentStatusPaidFallback({
	publicSlug,
	isParticipant,
}: PaymentStatusPaidFallbackProps) {
	return (
		<div className="relative z-10 flex flex-col items-center gap-6 text-center">
			<div className="bg-brand-yellow flex size-24 items-center justify-center rounded-3xl text-4xl">
				Paid
			</div>
			<div className="flex flex-col items-center gap-3">
				<h2 className="font-clash-display text-foreground text-30 font-semibold">
					Your payment is confirmed
				</h2>
				<p className="text-ink-500 text-body-sm max-w-sm">
					Your entries are in. We could not load the final stats here, but your
					sweepstakes page will show them once it refreshes.
				</p>
			</div>
			<Button asChild size="lg" variant={isParticipant ? 'default' : 'outline'}>
				<Link href={isParticipant ? '/my-raffles' : `/browse/${publicSlug}`}>
					{isParticipant ? 'View my sweepstakes' : 'Back to sweepstakes'}
				</Link>
			</Button>
		</div>
	);
}
