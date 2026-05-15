'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { calculateOrderTotal } from '@/lib/checkout/calculate-order-total';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import type { ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleSubscriptionContext } from '@/types/subscription';

interface StickyStateInputs {
	/** Raffle id forwarded to the free-tickets claim flow — backend keys the
	 * $0 order off it just like the paid flow. */
	raffleId: string;
	isAuthenticated: boolean;
	disabled: boolean;
	availableTickets: number;
	price: number;
	currency: string;
	/** Same subscription snapshot the inline `TicketPurchaseCard` consumes —
	 * shared across desktop card + mobile sticky so both surfaces compute the
	 * subscriber-effective total via the same scaled-int math. */
	subscription: RaffleSubscriptionContext;
}

interface BundleControls {
	/** Per-click additive bundle sizes (mobile quick-picks) */
	readonly sizes: readonly number[];
	/** Click handler — mutates shared ticket-quantity store */
	onPick: (size: number) => void;
	/** True when the cap has been hit; bundles stay rendered but inert */
	disabled: boolean;
	/** True when a free-tickets promo locks quantity — bundles are hidden */
	hidden: boolean;
}

interface PurchasableState {
	kind: 'purchasable';
	signInUrl: null;
	bundles: BundleControls;
	/** Primary CTA label — "One time purchase $X" or "AMOE - Free Entries". */
	primaryCtaLabel: string;
	primaryCtaTitle: string | undefined;
	isPrimaryCtaDisabled: boolean;
	/** Discriminator the variant renderer uses to wire the right onClick:
	 *  paid orders open the picker, free-tickets call `claim` directly. */
	isFreeTicketsPromo: boolean;
	/**
	 * Live acknowledgment flag. The sticky CTA can't itself render the
	 * checkbox (it lives in the scrolling card upstream), so the variant
	 * dispatcher uses this to decide whether to open the picker or call
	 * `requestAcknowledgment` to scroll the user back to the checkbox.
	 */
	isAccessPassAcknowledged: boolean;
	/** Opens the shared payment-method picker hosted in `TicketPurchaseCard`. */
	openPaymentMethodPicker: () => void;
	/** Surfaces the inline error + scrolls the checkbox into view. Invoked
	 *  by the variant when the user taps the paid CTA without ticking the
	 *  Access Pass acknowledgment. */
	requestAcknowledgment: () => void;
	/** Inputs the variant forwards to `useClaimFreeTickets` for the $0 path. */
	freeTicketsClaim: {
		readonly raffleId: string;
		readonly ticketQuantity: number;
		readonly promoCode: string | undefined;
	};
}

interface UnauthState {
	kind: 'unauthenticated';
	signInUrl: string;
}

interface HostDisabledState {
	kind: 'host-disabled';
}

export type StickyVariantState =
	| UnauthState
	| HostDisabledState
	| PurchasableState;

// Mobile quick-pick bundle sizes — additive (+10/+25/+50). Mirrored
// from the previous in-card mobile bundles, kept module-scoped so the
// array identity is stable across renders.
const BUNDLE_SIZES_MOBILE = [10, 25, 50] as const;

interface StoreSnapshot {
	quantity: number;
	incrementBy: (size: number, cap: number) => void;
	appliedPromo: ValidatedPromoCode | null;
	openPaymentMethodPicker: () => void;
	isAccessPassAcknowledged: boolean;
	requestAcknowledgment: () => void;
}

/**
 * Reads every quantity-store slice the sticky needs in one place.
 * Subscribing here (not in the main hook) keeps `useStickyState`
 * under the 60-line cap.
 *
 * The CTA stays tappable regardless of acknowledgment — when missing,
 * the variant dispatcher calls `requestAcknowledgment` instead of
 * opening the picker, scrolling the checkbox into view and flagging the
 * inline error. Per-tender gating inside the picker is gone (the
 * upstream trigger now owns the consent step).
 *
 * @returns Selected slices of the shared ticket-quantity store.
 */
function useQuantityStoreSlices(): StoreSnapshot {
	const quantity = useTicketQuantityStore(state => state.quantity);
	const incrementBy = useTicketQuantityStore(state => state.incrementBy);
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);
	const setPaymentMethodModalOpen = useTicketQuantityStore(
		state => state.setPaymentMethodModalOpen,
	);
	const isAccessPassAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);
	const requestAcknowledgment = useTicketQuantityStore(
		state => state.requestAcknowledgment,
	);
	return {
		quantity,
		incrementBy,
		appliedPromo,
		// Pre-bind the `true` argument so the variant renderer can pass it as
		// a stable `() => void` to onClick without re-wrapping each render.
		openPaymentMethodPicker: () => setPaymentMethodModalOpen(true),
		isAccessPassAcknowledged,
		requestAcknowledgment,
	};
}

interface PurchasablePayloadParams {
	inputs: StickyStateInputs;
	store: StoreSnapshot;
	/** Pre-computed by the hook so render + future checks share one math pass. */
	orderTotal: ReturnType<typeof calculateOrderTotal>;
}

/**
 * Builds the purchasable variant payload from the already-resolved
 * store reads. Pure data-shaping — no React calls — so it stays out
 * of `useStickyState`'s cap.
 */
function buildPurchasableState(
	params: PurchasablePayloadParams,
): PurchasableState {
	const { inputs, store, orderTotal } = params;
	const { total, isFreeTicketsPromo } = orderTotal;
	// 0 means unlimited participants — bundle clicks skip the clamp.
	const isUnlimited = inputs.availableTickets === 0;
	// Label mirrors the Figma "One time purchase $X" exactly — the per-tender
	// "with Card / with Credits / with Crypto" copy lives on the buttons
	// inside the picker, not on the trigger.
	const primaryCtaLabel = isFreeTicketsPromo
		? 'AMOE - Free Entries'
		: `One time purchase ${formatCurrency(total, inputs.currency)}`;
	return {
		kind: 'purchasable',
		signInUrl: null,
		bundles: {
			sizes: BUNDLE_SIZES_MOBILE,
			onPick: size =>
				store.incrementBy(size, isUnlimited ? 0 : inputs.availableTickets),
			// Only clamp when the cap has been hit — host case early-returns above.
			disabled: !isUnlimited && store.quantity >= inputs.availableTickets,
			hidden: isFreeTicketsPromo,
		},
		primaryCtaLabel,
		// CTA stays tappable — when acknowledgment is missing the variant
		// calls `requestAcknowledgment` instead of opening the picker, which
		// scrolls the user back to the checkbox and surfaces the inline
		// form error. Disabling here would hide the path to the fix.
		primaryCtaTitle: undefined,
		isPrimaryCtaDisabled: false,
		isFreeTicketsPromo,
		isAccessPassAcknowledged: store.isAccessPassAcknowledged,
		openPaymentMethodPicker: store.openPaymentMethodPicker,
		requestAcknowledgment: store.requestAcknowledgment,
		freeTicketsClaim: {
			raffleId: inputs.raffleId,
			ticketQuantity: store.quantity,
			promoCode: store.appliedPromo?.code,
		},
	};
}

/**
 * Derives which sticky variant to render from auth + host + raffle
 * state. The sticky no longer drives Stripe directly — it opens the
 * shared payment-method picker which owns all tender-specific wiring
 * (Stripe + credits + crypto + quiz gating). On free-tickets promos
 * the picker is bypassed; the variant renderer invokes the claim hook
 * directly using the `freeTicketsClaim` payload exposed here.
 *
 * @param inputs - Auth flag + disabled (host) flag + raffle identifiers.
 * @returns Discriminated union carrying everything the variant renderer needs.
 */
export function useStickyState(inputs: StickyStateInputs): StickyVariantState {
	// Hook calls must stay above any conditional returns — all branches
	// subscribe to the same set so React's hook order is stable.
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const store = useQuantityStoreSlices();
	const orderTotal = calculateOrderTotal({
		price: inputs.price,
		quantity: store.quantity,
		appliedPromo: store.appliedPromo,
		subscription: inputs.subscription,
	});

	if (!inputs.isAuthenticated) {
		// Preserve current query params on sign-in redirect so the user
		// lands on the same raffle context after auth.
		const search = searchParams.toString();
		const fullPath = search ? `${pathname}?${search}` : pathname;
		return {
			kind: 'unauthenticated',
			signInUrl: `/sign-in?returnTo=${encodeURIComponent(fullPath)}`,
		};
	}
	if (inputs.disabled) return { kind: 'host-disabled' };
	return buildPurchasableState({ inputs, store, orderTotal });
}

/**
 * Mirrors the `StoreSnapshot.clearPromo` field for callers that want to
 * forward it into `useClaimFreeTickets` — the hook needs the same promo
 * invalidation callback the inline checkout flows use.
 *
 * Hoisted to a separate hook so the sticky variant renderer can read it
 * without re-subscribing the whole `StoreSnapshot` cluster.
 */
export function useStickyClearPromo(): () => void {
	return useTicketQuantityStore(state => state.clearPromo);
}
