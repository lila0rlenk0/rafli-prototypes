'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import {
	buildCheckoutOrder,
	type BuildCheckoutOrderResult,
} from '@/lib/checkout/build-checkout-order';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { abandonOrder } from '@/services/payment/abandon-order';
import { creditBalanceKey } from '@/services/payment/use-credit-balance';

interface UseClaimFreeTicketsParams {
	readonly raffleId: string;
	readonly ticketQuantity: number;
	/** Promo code currently applied — required for the $0 settle path. */
	readonly promoCode: string | undefined;
	/** Promo invalidation hook — backend may reject a stale code mid-claim. */
	readonly onPromoInvalid: () => void;
}

interface UseClaimFreeTicketsResult {
	readonly isClaiming: boolean;
	/**
	 * Fires the free-tickets claim. Idempotent across rapid double-taps via
	 * the in-flight ref guard; the inner promise resolves after the
	 * confirmation modal has been opened (or the error toast has surfaced).
	 */
	readonly claim: () => Promise<void>;
}

/**
 * Pure decision used by `useClaimFreeTickets` to dispatch on the
 * `buildCheckoutOrder` outcome. Extracted out of the hook so the three
 * branches — pre-toasted failure, settled $0 order, orphan paid-pending
 * order — can be enumerated and verified without a React harness.
 *
 * Why three kinds, not two: the previous shape silently returned when
 * `isFullyDiscounted === false`, leaving a paid-pending order on the
 * backend and the user staring at an unchanged screen. The orphan-pending
 * branch surfaces that case so the hook can run the cleanup trio
 * (abandon order, clear stale promo, toast the user) instead of leaking
 * state.
 */
export type ClaimDecision =
	| { kind: 'aborted' }
	| { kind: 'settled'; orderId: string }
	| { kind: 'orphan-pending'; orderId: string };

/**
 * Maps a `buildCheckoutOrder` result to the next action the hook should
 * take. Total over the union — see {@link ClaimDecision} for the branch
 * rationale.
 *
 * @param result - Outcome from `buildCheckoutOrder`, or `null` when the
 *   helper already surfaced its own toast (promo invalid, order error).
 * @returns Discriminated action the caller dispatches on.
 */
export function interpretClaimResult(
	result: BuildCheckoutOrderResult | null,
): ClaimDecision {
	if (!result) return { kind: 'aborted' };
	if (result.isFullyDiscounted) {
		return { kind: 'settled', orderId: result.order.id };
	}
	return { kind: 'orphan-pending', orderId: result.order.id };
}

/**
 * Free-tickets claim flow — bypasses the payment-method picker entirely.
 *
 * Picker UX exists to choose a tender; a $0 free-tickets promo has no
 * tender to choose, so opening it would show three rows with no meaningful
 * action on any of them. The desktop in-card trigger and the mobile sticky
 * CTA both call this hook directly when `isFreeTicketsPromo` is true,
 * keeping the picker reserved for paid orders.
 *
 * Mechanics mirror the `isFullyDiscounted` branch of `CreditsBuyButton`:
 *  1. `buildCheckoutOrder` posts the order with the promo attached.
 *  2. Backend auto-completes the order when the discount covers 100%.
 *  3. We invalidate the credit-balance cache (the navbar badge / button
 *     state share the same query key as the credits flow even though no
 *     credits were spent — keeps cache freshness consistent across flows).
 *  4. `handlePurchaseSettled` opens the confirmation modal in the same
 *     atomic store update the credits success path uses.
 *  5. `router.refresh()` syncs the server-rendered ticket count.
 *
 * Errors are surfaced by `buildCheckoutOrder` via toast — this hook stays
 * silent on failure so callers don't double-toast.
 *
 * @returns `{ isClaiming, claim }` — wire `claim` to the trigger's onClick.
 */
export function useClaimFreeTickets({
	raffleId,
	ticketQuantity,
	promoCode,
	onPromoInvalid,
}: UseClaimFreeTicketsParams): UseClaimFreeTicketsResult {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isClaiming, setIsClaiming] = useState(false);
	// Synchronous double-tap guard — mirrors the pattern in `CreditsBuyButton`
	// and `BuyButton`. State alone races: two rapid clicks both observe
	// `isClaiming === false` before React commits the first `setIsClaiming(true)`.
	const claimInFlight = useRef(false);
	const handlePurchaseSettled = useTicketQuantityStore(
		state => state.handlePurchaseSettled,
	);

	const claim = useCallback(async () => {
		if (claimInFlight.current) return;
		claimInFlight.current = true;
		setIsClaiming(true);

		try {
			track(PURCHASE_EVENTS.TICKET_SELECTION_VIEWED, {
				raffle_id: raffleId,
				quantity: ticketQuantity,
				payment_method: 'free_tickets',
				has_promo: true,
			});

			const result = await buildCheckoutOrder({
				raffleId,
				ticketQuantity,
				promoCode,
				onPromoInvalid,
			});

			const decision = interpretClaimResult(result);
			// `aborted` — `buildCheckoutOrder` already toasted, so re-toasting
			// here would double-fire the same message at the user.
			if (decision.kind === 'aborted') return;

			if (decision.kind === 'orphan-pending') {
				// Backend created a paid-pending order on what should have been
				// a $0 claim — promo state drifted (e.g. quantity bumped past
				// the granted count after applying the promo). Best-effort
				// cleanup so the order doesn't haunt payment history, surface
				// the failure to the user, and clear the stale promo so the
				// next click goes through the picker on a clean slate.
				void abandonOrder(decision.orderId, 'free_tickets');
				onPromoInvalid();
				toast.error(
					"This promo couldn't be redeemed. Please reapply it or pick another payment method.",
				);
				return;
			}

			// `settled` — backend auto-completed the $0 order. Mirror
			// `CreditsBuyButton.invalidateCreditBalance` so the navbar badge
			// re-reads via this query key even though no credits were spent;
			// keeps cache freshness consistent across the two free-flavored
			// settle paths.
			void queryClient.invalidateQueries({ queryKey: creditBalanceKey() });
			handlePurchaseSettled();
			router.refresh();
		} finally {
			claimInFlight.current = false;
			setIsClaiming(false);
		}
	}, [
		handlePurchaseSettled,
		onPromoInvalid,
		promoCode,
		queryClient,
		raffleId,
		router,
		ticketQuantity,
	]);

	return { isClaiming, claim };
}
