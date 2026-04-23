'use client';

import { StickyCtaVariants } from './sticky-cta/variants';
import { useStickyState } from './sticky-cta/use-sticky-state';
import { useStickyVisibility } from './sticky-cta/use-sticky-visibility';
import type { XShareConfig } from './x-share/use-share';

interface StickyBuyTicketsCtaProps extends XShareConfig {
	/** Unauthenticated users get plain share — can't attribute tickets without an account */
	isAuthenticated: boolean;
	/** Cap for bundle quick-picks. 0 = unlimited participants. */
	availableTickets: number;
	/** Mirrors the card's purchase-disabled gate (own raffle, not yet open, etc.) */
	disabled?: boolean;
	/** Per-ticket price in major currency units — drives the inline total label. */
	price: number;
	/** ISO 4217 currency code — drives the inline total label format. */
	currency: string;
}

/**
 * Sticky CTA bar at the bottom of the viewport (mobile only).
 *
 * Thin shell — composes three focused pieces:
 *  1. `useStickyVisibility` decides whether the sticky should render.
 *  2. `useStickyState` derives a discriminated-union variant from the
 *     current auth + host + raffle state, wiring Stripe + X-share.
 *  3. `StickyCtaVariants` dispatches the variant JSX.
 *
 * Variants (priority order):
 *  - **Unauthenticated** — collapses to a single "Sign in to enter" link.
 *    Guests can't purchase and can't earn an attributed X share.
 *  - **Host viewing own sweepstakes** (`disabled=true`) — returns null.
 *    The inline `TicketPurchaseCard` already renders disabled state +
 *    gate copy; duplicating in the sticky contradicts the card.
 *  - **Authenticated, non-host** — full bar: bundle quick-picks, primary
 *    "Enter now · $X.XX" CTA, and "Get Bonus Entries! Share on X".
 *
 * Hidden on desktop (`lg:hidden` inside the variant shell) where the
 * sidebar checkout is always alongside content.
 *
 * @param props - Raffle identifiers + auth + price + availability.
 * @returns The sticky bar JSX, or `null` when the host branch is active.
 */
export function StickyBuyTicketsCta(
	props: StickyBuyTicketsCtaProps,
): React.JSX.Element | null {
	const { visible } = useStickyVisibility();
	const state = useStickyState({
		raffleId: props.raffleId,
		title: props.title,
		publicSlug: props.publicSlug,
		xShareEnabled: props.xShareEnabled,
		xShareClaimStatus: props.xShareClaimStatus,
		questionId: props.questionId,
		isAuthenticated: props.isAuthenticated,
		availableTickets: props.availableTickets,
		disabled: props.disabled ?? false,
		price: props.price,
		currency: props.currency,
	});
	if (!visible) return null;
	return <StickyCtaVariants state={state} />;
}
