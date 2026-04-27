'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { calculateOrderTotal } from '@/lib/checkout/calculate-order-total';
import { useStripeCheckout } from '@/lib/checkout/use-stripe-checkout';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import type { ValidatedPromoCode } from '@/types/promo-code';

import { type XShareConfig, useXShare } from '../x-share/use-share';

export interface StickyStateInputs extends XShareConfig {
	isAuthenticated: boolean;
	disabled: boolean;
	availableTickets: number;
	price: number;
	currency: string;
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
	/** Primary CTA label — "One Time Purchase - $X.XX" or "Claim bonus entr(y|ies)" */
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

/**
 * Builds the primary CTA label. Free-tickets promos flip to a "Claim
 * bonus entries" copy with the granted count; otherwise "One Time
 * Purchase - $X.XX" so users always see the exact charge on the action
 * surface, matching the desktop in-card BuyButton copy.
 */
function buildPrimaryCtaLabel(params: {
	isCheckoutLoading: boolean;
	isFreeTicketsPromo: boolean;
	freeTicketCount: number;
	total: number;
	currency: string;
}): string {
	if (params.isCheckoutLoading) return 'Processing...';
	if (params.isFreeTicketsPromo) {
		// Floor matches the displayed integer — guards against decimal
		// drift if the grant count arrives non-integer (mirrors promo-code.ts).
		const count = Math.floor(params.freeTicketCount);
		return `Claim bonus entr${count === 1 ? 'y' : 'ies'}`;
	}
	return `One Time Purchase - ${formatCurrency(params.total, params.currency)}`;
}

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
}

/**
 * Builds the purchasable variant payload from the already-resolved
 * hook results. Pure data-shaping — no React calls — so it stays out
 * of `useStickyState`'s cap.
 */
function buildPurchasableState(
	params: PurchasablePayloadParams,
): PurchasableState {
	const { inputs, store, checkout, xShare } = params;
	const { total, isFreeTicketsPromo, freeTicketCount } = calculateOrderTotal({
		price: inputs.price,
		quantity: store.quantity,
		appliedPromo: store.appliedPromo,
	});
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
			freeTicketCount,
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
	const checkout = useStripeCheckout({
		raffleId: inputs.raffleId,
		publicSlug: inputs.publicSlug,
		questionId: inputs.questionId,
		disabled: inputs.disabled,
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
	return buildPurchasableState({ inputs, store, checkout, xShare });
}
