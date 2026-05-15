'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { PaymentModalDecor } from '@/assets/payment-modal-decor';
import { TicketIcon } from '@/assets/ticket-icon';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface EntriesConfirmedModalProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly publicSlug: string;
	/**
	 * Raffle title — folded into the share copy so the tweet reads as a
	 * recommendation tied to a specific sweepstakes instead of a generic
	 * referral, lifting the click-through. Falls back to a neutral message
	 * if the title isn't available.
	 */
	readonly raffleTitle?: string;
}

/**
 * Post-purchase celebration modal — confirms entries are in, links back
 * to "My Sweepstakes" for participants, and offers an X share for a
 * follow-on free entry. Triggered by tender paths that settle while
 * still on this page (currently the credits flow inside the
 * payment-method picker). Stripe's redirect-back flow renders a sibling
 * `PaymentStatusPaid` view that shares the same copy + visuals so the
 * confirmation moment is consistent across both entry points.
 *
 * Top-edge decorations mirror the picker's bottom-edge pair (same SVGs,
 * non-rotated) so the two modals bookend the purchase moment with the
 * same brand palette.
 *
 * @returns Dialog with celebration copy + share row
 */
export function EntriesConfirmedModal({
	open,
	onOpenChange,
	publicSlug,
	raffleTitle,
}: EntriesConfirmedModalProps) {
	const handleShareOnX = useCallback(() => {
		// Branch on title so the tweet reads as either a titled recommendation
		// ("Just entered <title>...") or a neutral fallback when the title
		// isn't available. The link is always the canonical browse URL so
		// the click-through lands on the same page the entrant just bought
		// into.
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Close button child selectors — shadcn's DialogClose is sized
			    to its 16px X icon (no width/height), which (a) breaks the
			    44×44 mobile touch-target rule and (b) gets visually lost
			    against the rotated PaymentModalDecor at the top edge. The
			    `[&_[data-slot=dialog-close]]:*` overrides expand the hit
			    area to 44×44, anchor it above the decor (`z-20`), and add
			    a translucent chip so the X stands off the colored shapes. */}
			<DialogContent className="border-ink-alpha [&_[data-slot=dialog-close]]:bg-background/80 gap-10 overflow-hidden max-lg:inset-0 max-lg:flex max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:flex-col max-lg:justify-center max-lg:overflow-y-auto max-lg:rounded-none max-lg:border-0 max-lg:px-6 max-lg:pt-32 max-lg:pb-12 lg:max-w-(--container-card-md) lg:rounded-3xl lg:px-12 lg:py-20 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:backdrop-blur-sm">
				{/* Top-anchored decoration — same SVG cluster as the picker,
				    rotated 180° so the sky/mint/yellow shapes peek down from
				    the top edge. The two modals bookend the purchase flow:
				    picker has the cluster at the bottom, celebration has it
				    mirrored at the top. `pointer-events-none` so the SVG
				    never absorbs taps; the parent's `overflow-hidden` +
				    `rounded-3xl` crops the rotated edges. */}
				<PaymentModalDecor
					className="pointer-events-none absolute top-0 left-0 z-0 w-full rotate-180"
					aria-hidden
				/>

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
						<Button
							asChild
							variant="outline"
							className="mt-2 h-12 w-64 rounded-full px-6 text-base/4 font-semibold"
						>
							<Link href="/my-raffles">View my Sweepstakes</Link>
						</Button>
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
			</DialogContent>
		</Dialog>
	);
}
