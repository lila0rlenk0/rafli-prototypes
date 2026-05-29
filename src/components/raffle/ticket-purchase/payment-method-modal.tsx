'use client';

import { PaymentModalDecor } from '@/assets/payment-modal-decor';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleCryptoOptions } from '@/types/raffle';

import { PaymentModalHeader } from './payment-modal-header';
import { TenderStack } from './tender-stack';

interface PaymentMethodModalProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly raffleId: string;
	readonly publicSlug: string;
	readonly endAt: string;
	readonly currency: string;
	readonly disabled: boolean;
	readonly questionId: string | null | undefined;
	readonly total: number;
	readonly ticketQuantity: number;
	readonly appliedPromo: ValidatedPromoCode | null;
	readonly clearPromo: () => void;
	readonly cryptoOptions: RaffleCryptoOptions | null | undefined;
	readonly hasSelectableCryptoPaymentOption: boolean;
	readonly showCreditsOption: boolean;
	readonly availableCredits: string | null | undefined;
	readonly myTicketsTotal: number;
	readonly userId: string | null | undefined;
	/** Raffle title — surfaced under the Total amount so the user sees
	 *  which sweepstakes they're entering. Optional because the field is
	 *  not yet hydrated on every code path that opens the picker. */
	readonly raffleTitle?: string;
	/**
	 * Invoked by tender paths that settle synchronously inside this modal —
	 * currently the credits flow. Lets the host swap the picker out for the
	 * entries-confirmed celebration in the same store update.
	 *
	 * Stripe redirects out before settling and crypto runs its own confirm
	 * modal, so neither path fires this callback.
	 */
	readonly onPurchaseSettled?: () => void;
}

// Internal destination for the credits upsell — `/pricing` is where credit
// packs and Pro tier are merchandised, so the upsell's "View packs" promise
// lands on a page that actually shows them. Lives at module scope so the
// value can't drift across re-renders and a future swap stays a single line.
const CREDITS_UPSELL_HREF = '/pricing';

/**
 * Payment-method picker. Triggered by the desktop in-card "One Time
 * Purchase" button and the mobile sticky CTA — both surfaces toggle a
 * single instance hosted by `TicketPurchaseCard`, so checkout state stays
 * in one place per tender.
 *
 * Mobile (< lg): fullscreen sheet via `max-lg:` overrides on `DialogContent`.
 * The shadcn primitive only fullscreens at `max-sm:`, but the sticky CTA
 * hides at `lg:hidden` — extending the fullscreen breakpoint keeps the two
 * mobile surfaces aligned, so a tablet user doesn't see a centered modal
 * stacked on top of the sticky bar.
 *
 * Visual model (per Figma redesign):
 * - Header: HandCoins emblem, title, "refund on cancel" reassurance line
 * - Total: large amount + "Nx entry · {raffleTitle}" caption
 * - Tender rows: pill-shaped `TenderRow` per option. Credits is the only
 *   ever-filled row — when the user has balance it leads the list as the
 *   promoted action; when they don't, Card moves to the top slot and no
 *   row carries the filled emphasis (the yellow upsell becomes the visual
 *   next-best-action instead).
 * - Crypto preview: tapping the Crypto row reveals an inline chain summary
 *   list and marks the row as `active` (outlined brand-dark) so the user
 *   can see which networks the raffle accepts. The tap also fires the
 *   existing wallet/checkout flow — expansion persists across modal
 *   dismissals so backing out returns the user to the expanded picker.
 * - Credits upsell: yellow card promoting credits when the user has none
 * - Footer: terms acknowledgment line under the rows
 *
 * Free-tickets promos bypass this modal entirely — the trigger surfaces
 * invoke the $0 claim path directly. The picker is reserved for orders
 * that need a tender choice; a $0 promo doesn't.
 *
 * @returns Dialog hosting credits / card / crypto buy buttons
 */
export function PaymentMethodModal(props: PaymentMethodModalProps) {
	const {
		open,
		onOpenChange,
		raffleId,
		publicSlug,
		endAt,
		currency,
		disabled,
		questionId,
		total,
		ticketQuantity,
		appliedPromo,
		clearPromo,
		cryptoOptions,
		hasSelectableCryptoPaymentOption,
		showCreditsOption,
		availableCredits,
		myTicketsTotal,
		userId,
		raffleTitle,
		onPurchaseSettled,
	} = props;

	// Tender availability split into local booleans so the JSX reads
	// linearly: each tender slot has one flag, checked once. The truthy
	// `availableCredits` test covers the null + empty-string cases from
	// the upstream fetch in a single line.
	const isCreditsAvailable = showCreditsOption && !!availableCredits;
	const isCryptoAvailable = !!cryptoOptions && hasSelectableCryptoPaymentOption;

	const entryCaption = buildEntryCaption({ ticketQuantity, raffleTitle });

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* Mobile lays the chrome out as a flex column (`max-lg:flex max-lg:
			    flex-col max-lg:p-0`) so the scrollable content region fills the
			    fullscreen sheet without fighting the shadcn default `grid p-6`.
			    Padding moves to the inner scroll wrapper on mobile so the body
			    can use the full sheet width. */}
			<DialogContent className="border-ink-alpha overflow-hidden max-lg:inset-0 max-lg:flex max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:flex-col max-lg:gap-0 max-lg:rounded-none max-lg:border-0 max-lg:p-0 lg:max-w-(--container-card-md) lg:rounded-3xl lg:px-12 lg:py-16">
				{/* Bottom-anchored decoration — sky / mint / yellow SVG cluster
				    that peeks up from the modal bottom, clipped by the parent's
				    `overflow-hidden`. `pointer-events-none` so taps fall through;
				    negative z keeps it behind content without disturbing the
				    shadcn close button stacking.
				    Wrapper carries the ambient drift so the picker bookends
				    the celebration modal's matching float on the same shapes. */}
				<div
					aria-hidden
					className="motion-safe:animate-float-ambient pointer-events-none absolute bottom-0 left-0 -z-10 w-full"
				>
					<PaymentModalDecor className="w-full" />
				</div>

				{/* Content cluster — header + tender stack + footer.
				    `max-w-(--container-tender-content)` (590px) pins the column
				    to the figma's content-frame width so the header copy, total,
				    and methods column share the same wrap rhythm and sit
				    centered inside the 830px modal canvas. On mobile this is
				    the `flex-1` scrollable region filling the fullscreen sheet. */}
				<div className="mx-auto flex w-full max-w-(--container-tender-content) flex-col gap-6 max-lg:flex-1 max-lg:justify-center max-lg:gap-8 max-lg:overflow-y-auto max-lg:px-6 max-lg:py-12">
					<PaymentModalHeader
						total={total}
						currency={currency}
						entryCaption={entryCaption}
					/>

					<TenderStack
						raffleId={raffleId}
						publicSlug={publicSlug}
						endAt={endAt}
						currency={currency}
						disabled={disabled}
						questionId={questionId}
						total={total}
						ticketQuantity={ticketQuantity}
						appliedPromo={appliedPromo}
						clearPromo={clearPromo}
						cryptoOptions={cryptoOptions}
						isCreditsAvailable={isCreditsAvailable}
						isCryptoAvailable={isCryptoAvailable}
						availableCredits={availableCredits}
						myTicketsTotal={myTicketsTotal}
						userId={userId}
						creditsUpsellHref={CREDITS_UPSELL_HREF}
						onPurchaseSettled={onPurchaseSettled}
					/>

					<p className="text-ink-300 text-center text-sm">
						By continuing, you agree to entry terms.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface BuildEntryCaptionParams {
	readonly ticketQuantity: number;
	readonly raffleTitle: string | undefined;
}

/**
 * Builds the "Nx entry · {raffleTitle}" line shown under the Total amount.
 * Returns `null` when the raffle title isn't hydrated yet so the caption
 * row collapses cleanly instead of rendering a half-formed line.
 */
function buildEntryCaption({
	ticketQuantity,
	raffleTitle,
}: BuildEntryCaptionParams): string | null {
	if (!raffleTitle) return null;
	const entryWord = ticketQuantity === 1 ? 'entry' : 'entries';
	return `${ticketQuantity} ${entryWord} · ${raffleTitle}`;
}
