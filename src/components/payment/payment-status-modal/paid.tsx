'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { TicketIcon } from '@/assets/ticket-icon';
import { Button } from '@/components/ui/button';
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface PaymentStatusPaidProps {
	publicSlug: string;
	/** Raffle title — folded into the share copy so the tweet names the
	 * specific sweepstakes. Mirrors the in-page `EntriesConfirmedModal`
	 * so the share UX doesn't drift between tender paths. */
	raffleTitle: string;
	/**
	 * Hosts viewing their own raffle land here too on a Stripe redirect-back;
	 * they shouldn't see a "View My Sweepstakes" deep-link (their sweepstakes
	 * surface is the host dashboard, not /my-raffles). The flag keeps the
	 * participant CTA participant-scoped.
	 */
	isParticipant: boolean;
}

/**
 * Stripe-return success state — mirrors `EntriesConfirmedModal` (the
 * in-page success modal that fires on credits + free-tickets flows) so
 * the confirmation moment is visually identical regardless of tender
 * path. Layout, copy, icon, and share text match exactly; the only
 * structural difference is the host-mode branch (Stripe redirect can
 * land hosts back on their own raffle while the in-page modal can't).
 *
 * Renders inside `PaymentStatusModal`'s `DialogContent`, which carries
 * the matching shell + decor; this component renders only the inner
 * cluster.
 */
export function PaymentStatusPaid({
	publicSlug,
	raffleTitle,
	isParticipant,
}: PaymentStatusPaidProps) {
	const handleShareOnX = useCallback(() => {
		// Branch on title presence so the tweet either names the sweepstakes
		// or falls back to the generic line — `raffleTitle` should always be
		// non-empty here (page-level prop), but the guard absorbs the
		// degenerate empty-string case without bleeding "undefined" into
		// social copy.
		const text = raffleTitle
			? `Just entered ${raffleTitle} on Rafli — join me!`
			: 'Just entered this sweepstakes on Rafli — join me!';
		const link = `${window.location.origin}/browse/${publicSlug}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
			text,
		)}&url=${encodeURIComponent(link)}`;
		window.open(url, '_blank', 'noopener,noreferrer');
	}, [publicSlug, raffleTitle]);

	return (
		<>
			<DialogHeader className="relative z-10 flex flex-col items-center gap-10">
				<TicketIcon className="size-20" />
				<div className="flex flex-col items-center gap-4">
					<DialogTitle className="font-clash-display text-foreground text-center text-4xl/9 font-semibold tracking-tight">
						Your entries are in!
					</DialogTitle>
					<DialogDescription className="text-foreground text-center text-base/6">
						Your entries are confirmed and your odds are set.
						<br />
						Sit tight. Winners drop when the timer hits zero.
					</DialogDescription>
					{isParticipant ? (
						<Button
							asChild
							variant="outline"
							className="mt-2 h-12 w-64 rounded-full px-6 text-base/4 font-semibold"
						>
							<Link href="/my-raffles">View my Sweepstakes</Link>
						</Button>
					) : null}
				</div>
			</DialogHeader>

			<div className="relative z-10 flex flex-col items-center gap-4">
				<p className="text-foreground text-center text-lg/4 font-semibold">
					Get a free entry by spreading the word!
				</p>
				<Button
					onClick={handleShareOnX}
					className="h-12 w-64 cursor-pointer rounded-full px-6 text-base/4 font-semibold"
				>
					Share on X
				</Button>
			</div>
		</>
	);
}
