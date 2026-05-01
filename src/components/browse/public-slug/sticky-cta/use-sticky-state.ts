'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { buildPrimaryCtaLabel } from '@/components/raffle/ticket-purchase/cta-label';
import { calculateOrderTotal } from '@/lib/checkout/calculate-order-total';
import { useStripeCheckout } from '@/lib/checkout/use-stripe-checkout';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import type { ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleSubscriptionContext } from '@/types/subscription';

import { type XShareConfig, useXShare } from '../x-share/use-share';

interface StickyStateInputs extends XShareConfig {
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
	/** Primary CTA label — one of the canonical AMOE/card checkout labels. */
	primaryCtaLabel: string;
	primaryCtaTitle: string | undefined;
	isPrimaryCtaDisabled: boolean;
	isCheckoutLoading: boolean;
	initiateCheckout: () => void;
	showQuestionModal: boolean;
	setShowQuestionModal: (open: boolean) => void;
	handleCheckoutCorrectAnswer: () => void;
	questionId: string | null | undefined;
	raffleId: string;
	isFreeTicketsPromo: boolean;
	xShare: ReturnType<typeof useXShare>;
	xShareEnabled: boolean;
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
	isAccessPassAcknowledged: boolean;
}

/**
 * Reads every quantity-store slice the sticky needs in one place.
 * Subscribing here (not in the main hook) keeps `useStickyState`
 * under the 60-line cap.
 *
 * @returns Selected slices of the shared ticket-quantity store.
 */
function useQuantityStoreSlices(): StoreSnapshot {
	const quantity = useTicketQuantityStore(state => state.quantity);
	const incrementBy = useTicketQuantityStore(state => state.incrementBy);
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);
	// Access Pass acknowledgment gates the paid sticky CTA — mirrors the
	// desktop BuyButton gate. Free-tickets promos bypass (no consideration).
	const isAccessPassAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);
	return { quantity, incrementBy, appliedPromo, isAccessPassAcknowledged };
}

interface PurchasablePayloadParams {
	inputs: StickyStateInputs;
	store: StoreSnapshot;
	checkout: ReturnType<typeof useStripeCheckout>;
	xShare: ReturnType<typeof useXShare>;
	/** Pre-computed by the hook so checkout-init + render share one math pass. */
	orderTotal: ReturnType<typeof calculateOrderTotal>;
}

/**
 * Builds the purchasable variant payload from the already-resolved
 * hook results. Pure data-shaping — no React calls — so it stays out
 * of `useStickyState`'s cap.
 */
function buildPurchasableState(
	params: PurchasablePayloadParams,
): PurchasableState {
	const { inputs, store, checkout, xShare, orderTotal } = params;
	const { total, isFreeTicketsPromo } = orderTotal;
	// 0 means unlimited participants — bundle clicks skip the clamp.
	const isUnlimited = inputs.availableTickets === 0;
	const isPrimaryCtaDisabled =
		checkout.isLoading ||
		(!isFreeTicketsPromo && !store.isAccessPassAcknowledged);
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
		primaryCtaLabel: buildPrimaryCtaLabel({
			isCheckoutLoading: checkout.isLoading,
			isFreeTicketsPromo,
			total,
			currency: inputs.currency,
		}),
		primaryCtaTitle:
			isPrimaryCtaDisabled && !checkout.isLoading && !isFreeTicketsPromo
				? 'Please acknowledge the terms above to continue'
				: undefined,
		isPrimaryCtaDisabled,
		isCheckoutLoading: checkout.isLoading,
		initiateCheckout: checkout.initiate,
		showQuestionModal: checkout.showQuestionModal,
		setShowQuestionModal: checkout.setShowQuestionModal,
		handleCheckoutCorrectAnswer: checkout.handleCorrectAnswer,
		questionId: inputs.questionId,
		raffleId: inputs.raffleId,
		isFreeTicketsPromo,
		xShare,
		xShareEnabled: inputs.xShareEnabled,
	};
}

/**
 * Derives which sticky variant to render from auth + host + raffle
 * state. Owns the Stripe-checkout + X-share wiring for the purchasable
 * branch — the renderer stays declarative.
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
	// Pre-compute the displayed total once so `useStripeCheckout` can verify
	// BE charges match what the user agreed to. Same math the variant renderer
	// uses below — extracted to share the result without recomputing.
	const orderTotal = calculateOrderTotal({
		price: inputs.price,
		quantity: store.quantity,
		appliedPromo: store.appliedPromo,
		subscription: inputs.subscription,
	});
	const checkout = useStripeCheckout({
		raffleId: inputs.raffleId,
		publicSlug: inputs.publicSlug,
		questionId: inputs.questionId,
		disabled: inputs.disabled,
		expectedTotal: orderTotal.total,
	});
	const xShare = useXShare({
		raffleId: inputs.raffleId,
		title: inputs.title,
		publicSlug: inputs.publicSlug,
		// Unauth users always get plain share — tokenized flow requires auth.
		xShareEnabled: inputs.isAuthenticated && inputs.xShareEnabled,
		xShareClaimStatus: inputs.xShareClaimStatus,
		questionId: inputs.questionId,
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
	return buildPurchasableState({ inputs, store, checkout, xShare, orderTotal });
}
