'use client';

import { useSearchParams } from 'next/navigation';

import {
	calculateOrderTotal,
	type OrderTotal,
} from '@/lib/checkout/calculate-order-total';
import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';
import {
	isWeb3Enabled,
	SUPPORTED_WEB3_CHAIN_IDS,
} from '@/lib/web3/config/constants';
import { hasSelectableCryptoChains } from '@/lib/web3/payment/raffle-crypto-options';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import type { RaffleCryptoOptions } from '@/types/raffle';
import type { ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleSubscriptionContext } from '@/types/subscription';

import { parseAvailableCredits } from './ticket-purchase-present';

interface UseTicketPurchaseParams {
	/** Raffle end timestamp — drives the sale-window "closing soon" flag. */
	readonly endAt: string;
	/** Per-entry price in major currency units. */
	readonly price: number;
	/** Structured crypto options from the raffle — null when crypto disabled. */
	readonly cryptoOptions: RaffleCryptoOptions | null | undefined;
	/** User credit balance as decimal string — null when unauthenticated or fetch failed. */
	readonly availableCredits: string | null | undefined;
	/** Active subscription snapshot — drives subscriber-effective unit price math. */
	readonly subscription: RaffleSubscriptionContext;
}

interface UseTicketPurchaseResult {
	readonly initialCode: string | undefined;
	readonly ticketQuantity: number;
	readonly appliedPromo: ValidatedPromoCode | null;
	/** Monotonic reset version — keys the promo input to force remount on clear. */
	readonly promoResetVersion: number;
	readonly applyPromo: (promo: ValidatedPromoCode) => void;
	/** Clears the promo without resetting quantity — used by outside invalidations. */
	readonly clearPromo: () => void;
	/** Explicit user-initiated clear — also resets quantity back to 1. */
	readonly handleClearPromo: () => void;
	readonly orderTotal: OrderTotal;
	/** Render free-ticket branch when the applied promo is a free-tickets grant. */
	readonly isFree: boolean;
	readonly hasDiscount: boolean;
	/** Gate the closing-soon warning until the browser clock has hydrated. */
	readonly shouldShowClosingSoonWarning: boolean;
	/** Same gate the modal uses — prevents an empty selector on unsupported chains. */
	readonly hasSelectableCryptoPaymentOption: boolean;
	/** Credits CTA visibility — user has credits, order costs money, not a free promo. */
	readonly showCreditsOption: boolean;
}

/**
 * Binds all checkout-card derived state and event handlers in one place so
 * the surface components stay presentational. Store reads colocate with the
 * math they feed, keeping the parent `TicketPurchaseCard` under the complexity
 * budget and preventing prop drilling for the three sibling subviews
 * (quantity / promo / price breakdown).
 *
 * @param params - Props forwarded from `TicketPurchaseCard`
 * @returns Derived state + memoized handlers consumed by the card surfaces
 */
export function useTicketPurchase(
	params: UseTicketPurchaseParams,
): UseTicketPurchaseResult {
	const { endAt, price, cryptoOptions, availableCredits, subscription } =
		params;

	const searchParams = useSearchParams();
	// `isClosingSoon` is only true when secondsRemaining > 0 — no separate
	// expiry gate needed here.
	const { isClosingSoon, isHydrated } = useRaffleSaleWindow(endAt);
	const codeParam = searchParams.get('code');
	// Trim + empty-string fallback so the `?code=` edge case does not key the
	// promo input with a blank value (would trigger an auto-validate with "").
	const initialCode = codeParam?.trim() || undefined;

	// All checkout state lives in the page-scoped TicketQuantityStore so the
	// mobile StickyBuyTicketsCta and the inline card share a single source of
	// truth for quantity *and* applied promo.
	const ticketQuantity = useTicketQuantityStore(state => state.quantity);
	const resetTicketQuantity = useTicketQuantityStore(state => state.reset);
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);
	const promoResetVersion = useTicketQuantityStore(
		state => state.promoResetVersion,
	);
	const applyPromo = useTicketQuantityStore(state => state.applyPromo);
	const clearPromo = useTicketQuantityStore(state => state.clearPromo);

	function handleClearPromo() {
		// Explicit user clear (PromoCodeInput's clear button) drops the promo
		// AND resets quantity to 1 — preserves prior behavior where starting
		// over from the input also wipes manual quantity selection.
		clearPromo();
		resetTicketQuantity();
	}

	const orderTotal = calculateOrderTotal({
		price,
		quantity: ticketQuantity,
		appliedPromo,
		subscription,
	});
	const hasDiscount = orderTotal.discount > 0;
	const isFree = orderTotal.isFreeTicketsPromo;
	const shouldShowClosingSoonWarning = isHydrated && isClosingSoon;
	// Gate warning copy AND the crypto CTA on the same resolved chain set the
	// modal uses — otherwise unsupported backend chains can still surface a
	// crypto button that opens into an empty selector.
	const hasSelectableCryptoPaymentOption =
		hasSelectableCryptoChains(cryptoOptions, SUPPORTED_WEB3_CHAIN_IDS) &&
		isWeb3Enabled &&
		!isFree;

	// Credits CTA: user holds credits, order costs money, not a free-tickets
	// promo. The button itself handles insufficient-balance state (disabled +
	// tooltip) so this gate is a visibility check only.
	const creditBalance = parseAvailableCredits(availableCredits);
	const showCreditsOption =
		creditBalance > 0 && !isFree && orderTotal.total > 0;

	return {
		initialCode,
		ticketQuantity,
		appliedPromo,
		promoResetVersion,
		applyPromo,
		clearPromo,
		handleClearPromo,
		orderTotal,
		isFree,
		hasDiscount,
		shouldShowClosingSoonWarning,
		hasSelectableCryptoPaymentOption,
		showCreditsOption,
	};
}
