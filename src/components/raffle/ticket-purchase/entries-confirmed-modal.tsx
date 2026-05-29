'use client';

import { PaymentModalDecor } from '@/assets/payment-modal-decor';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { EntriesConfirmedBody } from './entries-confirmed-body';

const DIALOG_CONTENT_CLASS_NAME =
	// Close button overrides — shadcn's DialogClose is sized to its 16px X
	// icon (no width/height), which (a) fails the 44×44 mobile touch-target
	// rule and (b) gets visually lost against the rotated PaymentModalDecor.
	// The `[&_[data-slot=dialog-close]]:*` overrides expand the hit area,
	// anchor it above the decor (`z-20`), and add a translucent chip so the
	// X stands off the colored shapes.
	'border-ink-alpha [&_[data-slot=dialog-close]]:bg-background/80 gap-8 overflow-hidden max-lg:inset-0 max-lg:flex max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:flex-col max-lg:justify-center max-lg:overflow-y-auto max-lg:rounded-none max-lg:border-0 max-lg:px-6 max-lg:pt-24 max-lg:pb-12 lg:max-w-(--container-card-md) lg:rounded-3xl lg:px-12 lg:py-16 [&_[data-slot=dialog-close]]:z-20 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:backdrop-blur-sm';

interface EntriesConfirmedModalProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly publicSlug: string;
	/**
	 * Raffle title — folded into the celebration copy and X share text so
	 * the moment names the specific sweepstakes the entrant just bought into.
	 */
	readonly raffleTitle?: string;
	/** Entries the user just purchased. */
	readonly ticketQuantity: number;
	/**
	 * Final "Your Entries" value. In-page caller passes
	 * `myTicketsTotal + ticketQuantity` (the page is still pre-purchase when
	 * the modal opens — router.refresh hasn't landed yet).
	 */
	readonly yourEntries: number;
	/**
	 * Final "Total in Pool" value. Same caller responsibility as
	 * `yourEntries`.
	 */
	readonly totalInPool: number;
}

/**
 * Post-purchase celebration modal — thin Dialog shell wrapping the shared
 * `EntriesConfirmedBody`. The body owns tier resolution, animation
 * choreography, and the snapshot pattern that keeps the stats from
 * shifting when the parent RSC refreshes mid-celebration.
 *
 * Triggered by tender paths that settle while still on this page
 * (currently the credits flow inside the payment-method picker). Stripe's
 * redirect-back flow renders the same `EntriesConfirmedBody` inside
 * `PaymentStatusPaid` so the confirmation moment is consistent across
 * both entry points.
 *
 * @returns Dialog shell hosting the tier-keyed celebration body
 */
export function EntriesConfirmedModal({
	open,
	onOpenChange,
	publicSlug,
	raffleTitle,
	ticketQuantity,
	yourEntries,
	totalInPool,
}: EntriesConfirmedModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={DIALOG_CONTENT_CLASS_NAME}>
				{/* Top-anchored decoration — same SVG cluster as the picker, rotated
				    180° so the sky/mint/yellow shapes peek down from the top edge.
				    Wrapper carries the ambient drift so the decor's `rotate-180`
				    stays untouched on the SVG. */}
				<div
					aria-hidden
					className="motion-safe:animate-float-ambient pointer-events-none absolute top-0 left-0 z-0 w-full"
				>
					<PaymentModalDecor className="w-full rotate-180" />
				</div>

				<EntriesConfirmedBody
					publicSlug={publicSlug}
					raffleTitle={raffleTitle}
					ticketQuantity={ticketQuantity}
					yourEntries={yourEntries}
					totalInPool={totalInPool}
					participantHrefBase={`/my-raffles/${publicSlug}`}
					isParticipant
				/>
			</DialogContent>
		</Dialog>
	);
}
