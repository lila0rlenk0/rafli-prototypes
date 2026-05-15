'use client';

import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';

import { NoPurchaseNecessaryFootnote } from '@/components/compliance/no-purchase-necessary-footnote';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import { useClaimFreeTickets } from '@/components/raffle/ticket-purchase/use-claim-free-tickets';

import {
	useStickyClearPromo,
	type StickyVariantState,
} from './use-sticky-state';

// Shared shell classes for the fixed-bottom bar — extracted so the
// unauth + purchasable branches don't drift on padding/background.
// `pb-[max(...)]` preserves iOS safe-area inset without hard-coding
// a pixel value, and `lg:hidden` keeps the sticky mobile-only.
const SHELL_CLASS =
	'fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden';

interface UnauthVariantProps {
	signInUrl: string;
}

/**
 * Unauth branch — guests can't purchase, so the bar collapses to a
 * single sign-in CTA + the equal-prominence free-entry footnote (legal
 * exposure is the same regardless of auth state).
 *
 * @param signInUrl - Destination carrying the current `returnTo` path.
 * @returns The sign-in sticky bar JSX.
 */
function UnauthVariant({ signInUrl }: UnauthVariantProps): React.JSX.Element {
	return (
		<div className={SHELL_CLASS}>
			<Button
				asChild
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				<Link href={signInUrl}>
					<p className="font-semibold">Sign in to enter</p>
				</Link>
			</Button>
			<NoPurchaseNecessaryFootnote />
		</div>
	);
}

// Extract from `StickyVariantState` so the purchasable props list is
// a single reference site; any downstream shape change flows here.
type PurchasableState = Extract<StickyVariantState, { kind: 'purchasable' }>;

/**
 * Purchasable branch — bundle quick-picks, a single primary CTA that
 * either opens the shared payment-method picker (paid orders) or
 * directly claims free entries (free-tickets promo), and the
 * no-purchase footnote.
 *
 * The AMOE / X-share button is intentionally absent on this surface per
 * the Figma redesign — the picker carries all tender choices and the
 * footnote link (`/free-entry`) is the canonical AMOE path on mobile.
 */
function PurchasableVariant({
	state,
}: {
	state: PurchasableState;
}): React.JSX.Element {
	const {
		bundles,
		primaryCtaLabel,
		primaryCtaTitle,
		isPrimaryCtaDisabled,
		openPaymentMethodPicker,
		isFreeTicketsPromo,
		isAccessPassAcknowledged,
		requestAcknowledgment,
		freeTicketsClaim,
	} = state;

	const clearPromo = useStickyClearPromo();
	// Hook always mounts — instance is cheap when idle. Wiring it here
	// (not behind an `if isFreeTicketsPromo`) keeps React's hook order
	// stable across promo apply/clear transitions.
	const { claim: claimFreeTickets, isClaiming } = useClaimFreeTickets({
		raffleId: freeTicketsClaim.raffleId,
		ticketQuantity: freeTicketsClaim.ticketQuantity,
		promoCode: freeTicketsClaim.promoCode,
		onPromoInvalid: clearPromo,
	});

	function handlePrimaryClick() {
		// Free-tickets short-circuit — same dispatch as the desktop
		// `BuyCtaStack`. Both surfaces converge on `handlePurchaseSettled`
		// inside the claim hook, so the confirmation modal opens regardless
		// of which surface initiated the claim. Free entries carry no
		// consideration so the acknowledgment gate doesn't apply.
		if (isFreeTicketsPromo) {
			void claimFreeTickets();
			return;
		}
		// Paid path: enforce the consent gate before opening the picker.
		// The checkbox lives upstream in the scrolling card, so we call
		// the store action that scrolls it into view + surfaces the
		// inline error — instead of disabling the CTA, which would hide
		// the path to the fix on a small screen.
		if (!isAccessPassAcknowledged) {
			requestAcknowledgment();
			return;
		}
		openPaymentMethodPicker();
	}

	return (
		<div className={SHELL_CLASS}>
			{/* Bundle quick-picks — additive. Hidden for free-tickets promos
			    where the granted count locks quantity and bundles would
			    silently no-op (or exceed the grant). */}
			{bundles.hidden ? null : (
				<div className="flex items-center justify-between gap-2">
					{bundles.sizes.map(size => (
						<button
							key={size}
							onClick={() => bundles.onPick(size)}
							disabled={bundles.disabled}
							className={cn(
								'hover:bg-brand-sky flex w-full cursor-pointer items-center justify-center rounded-full border border-black py-3 text-sm transition-colors duration-150',
								'disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
							)}
						>
							+{size}
						</button>
					))}
				</div>
			)}
			{/* Primary CTA — paid orders open the picker; free-tickets call
			    the claim hook directly. Quiz gating + Stripe redirect happen
			    on the tender buttons inside the picker, not here, so the paid
			    branch stays a thin "open the chooser" action. */}
			<Button
				onClick={handlePrimaryClick}
				disabled={isPrimaryCtaDisabled || isClaiming}
				title={primaryCtaTitle}
				className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				{isClaiming ? (
					<Loader2Icon className="mr-2 size-4 animate-spin" />
				) : null}
				<p className="font-semibold">{primaryCtaLabel}</p>
			</Button>
			{isFreeTicketsPromo ? null : <NoPurchaseNecessaryFootnote />}
		</div>
	);
}

/**
 * Dispatches the sticky CTA render by variant kind. Exhaustive switch
 * with `default: never` — adding a new kind forces a compile error.
 *
 * @param state - Discriminated union from `useStickyState`.
 * @returns The JSX for the active variant, or `null` for host-disabled.
 */
export function StickyCtaVariants({
	state,
}: {
	state: StickyVariantState;
}): React.JSX.Element | null {
	switch (state.kind) {
		case 'unauthenticated':
			return <UnauthVariant signInUrl={state.signInUrl} />;
		case 'host-disabled':
			// Host viewing their own sweepstakes — inline TicketPurchaseCard
			// already renders disabled state + the "You cannot enter your
			// own sweepstakes" gate. Rendering an active-looking sticky on
			// top would contradict that.
			return null;
		case 'purchasable':
			return <PurchasableVariant state={state} />;
		default: {
			// Exhaustiveness — compile-time guard against unhandled kinds.
			const never: never = state;
			return never;
		}
	}
}
