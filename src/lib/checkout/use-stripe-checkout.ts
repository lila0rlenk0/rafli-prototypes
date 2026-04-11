'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { buildCheckoutOrder } from '@/lib/checkout/build-checkout-order';
import {
	getPaymentErrorMessage,
	getPromoErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { createCheckoutSession } from '@/services/payment/create-checkout-session';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';
import { PROMO_CODE_TYPE } from '@/types/promo-code';

/**
 * Inputs the hook needs from the consuming component to drive the
 * Stripe checkout flow. Quantity and promo state are read from the
 * shared `TicketQuantityStore` so callers don't have to pass them in
 * — that's the whole point of lifting the state into the store.
 */
export interface UseStripeCheckoutParams {
	raffleId: string;
	publicSlug: string;
	/** Optional quiz question that gates the purchase. */
	questionId?: string | null;
	/** Disabled by parent (host viewing own raffle, etc.) — short-circuits the action. */
	disabled?: boolean;
}

export interface UseStripeCheckoutResult {
	/** True while order build → checkout session creation is in flight. */
	readonly isLoading: boolean;
	/** Quiz modal open state — hook owns it so the modal lives next to the trigger. */
	readonly showQuestionModal: boolean;
	readonly setShowQuestionModal: (open: boolean) => void;
	/** Trigger the buy flow. Opens the quiz modal first when `questionId` is set. */
	readonly initiate: () => void;
	/** Continuation called by `RaffleQuestionModal` after the user answers correctly. */
	readonly handleCorrectAnswer: () => void;
}

/**
 * Encapsulates the Stripe checkout flow originally embedded in `BuyButton`.
 *
 * Why a hook (not a shared utility):
 * - Both the desktop in-card `BuyButton` and the mobile `StickyBuyTicketsCta`
 *   need to drive the same checkout flow with identical semantics (quiz gate,
 *   free-tickets redemption, promo invalidation, single-flight guard,
 *   loading state). Previously the sticky CTA achieved this via a brittle
 *   `document.getElementById('checkout-action').click()` hack that coupled
 *   two unrelated subtrees through a shared DOM id. The hook lets the sticky
 *   call the same flow directly with no DOM coupling.
 * - State that must be local to a button (loading, modal open, single-flight
 *   ref) belongs in a hook, not a vanilla utility.
 *
 * Two consumers, two hook instances:
 * - The in-card BuyButton lives behind `hidden lg:block` on mobile, so on
 *   mobile the hook still mounts but its UI is offscreen. The sticky's
 *   instance is the one users interact with. On desktop the inverse holds.
 *   Each instance has its own `isLoading`/single-flight state, but only one
 *   button is ever visible at a given breakpoint, so they never collide.
 *
 * @param params - Raffle ids, optional quiz question, optional disabled flag
 * @returns Action + state to wire into a button + a question modal
 */
export function useStripeCheckout(
	params: UseStripeCheckoutParams,
): UseStripeCheckoutResult {
	const { raffleId, publicSlug, questionId, disabled = false } = params;

	const router = useRouter();
	// Pathname + searchParams are read so the hook can strip the `?code=`
	// query param after a successful free-tickets redemption — without it,
	// a refresh would re-attempt the (now spent) promo and surface a misleading
	// "code already redeemed" toast.
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Quantity and promo are read from the shared store. Both consumers (the
	// in-card BuyButton and the sticky CTA) see the same values, so the order
	// payload is identical regardless of which button the user clicks.
	const quantity = useTicketQuantityStore(state => state.quantity);
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);
	const clearPromo = useTicketQuantityStore(state => state.clearPromo);

	const [isLoading, setIsLoading] = useState(false);
	const [showQuestionModal, setShowQuestionModal] = useState(false);

	// Synchronous single-flight guard for checkout. `setIsLoading(true)` is
	// async-batched, so rapid double-clicks can both enter `buildCheckoutOrder`
	// before React commits the disabled state. The ref blocks the second call
	// in the same tick. Why ref instead of state: we need a synchronous read
	// inside the click handler, before any React commit.
	const checkoutInFlight = useRef(false);

	// Free-tickets shortcut — when the applied promo grants free tickets we
	// skip the Stripe checkout entirely and call `redeemPromoCode` directly.
	// Mirrors the BuyButton's original branching.
	const isFreeTicketsPromo =
		appliedPromo?.type === PROMO_CODE_TYPE.FREE_TICKETS;
	const promoCode = appliedPromo?.code;

	/**
	 * Click handler for the buy button. Routes between quiz gate, free-tickets
	 * redemption, and the standard Stripe checkout flow.
	 */
	function initiate() {
		if (disabled || isLoading) return;

		// Analytics: TICKET_SELECTION_VIEWED — fired before any modal/flow so we
		// capture the user intent regardless of whether they complete the quiz
		// or abandon mid-checkout.
		track(PURCHASE_EVENTS.TICKET_SELECTION_VIEWED, {
			raffle_id: raffleId,
			quantity,
			payment_method: 'stripe',
			has_promo: !!promoCode,
			is_free_tickets: isFreeTicketsPromo,
		});

		// Quiz gate — open the modal and let `handleCorrectAnswer` continue.
		if (questionId) {
			setShowQuestionModal(true);
			return;
		}

		// Free-tickets shortcut — bypass Stripe entirely.
		if (isFreeTicketsPromo && promoCode) {
			void redeemFreeTickets();
			return;
		}

		void proceedToCheckout();
	}

	/**
	 * Continuation invoked by `RaffleQuestionModal` once the user answers
	 * correctly. Routes to the same redemption/checkout branches as `initiate`.
	 */
	function handleCorrectAnswer() {
		if (isFreeTicketsPromo && promoCode) {
			void redeemFreeTickets();
			return;
		}
		void proceedToCheckout();
	}

	/**
	 * Redeems a free-tickets promo via the dedicated endpoint. Skips order
	 * creation and Stripe checkout entirely — the backend mints the tickets
	 * and we refresh the page to reflect the new ticket count.
	 */
	async function redeemFreeTickets() {
		if (!promoCode) return;

		setIsLoading(true);

		try {
			const result = await redeemPromoCode({
				code: promoCode,
				raffleId,
			});

			if (!result.success) {
				toast.error(getPromoErrorMessage(result.error));
				if (shouldClearPromo(result.error)) {
					clearPromo();
				}
				return;
			}

			const { ticketsGranted } = result.data;
			const ticketText = ticketsGranted === 1 ? 'ticket' : 'tickets';
			toast.success(`You received ${ticketsGranted} free ${ticketText}!`);

			// Post-redemption cleanup:
			// 1. Strip `?code=` from the URL so a refresh doesn't re-apply the
			//    (now spent) promo and surface a misleading "already redeemed"
			//    toast. window.history.replaceState avoids a Next.js navigation
			//    so we don't unmount the page tree mid-success-toast.
			// 2. Drop the promo from the store so the input clears + the store
			//    stops attributing the granted quantity to the consumed promo.
			// 3. Refresh so the server-rendered ticket counts update.
			const params = new URLSearchParams(searchParams.toString());
			params.delete('code');
			const nextUrl = params.toString()
				? `${pathname}?${params.toString()}`
				: pathname;
			window.history.replaceState(null, '', nextUrl);

			clearPromo();
			router.refresh();
		} catch (error) {
			console.error('Unexpected error during redemption:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			setIsLoading(false);
		}
	}

	/**
	 * Standard paid-checkout flow. Builds the order (with promo handling),
	 * creates a Stripe checkout session, and redirects to Stripe's hosted
	 * checkout page. Single-flight guarded so double-clicks can't create
	 * two orders / two sessions.
	 */
	async function proceedToCheckout() {
		if (checkoutInFlight.current) return;
		checkoutInFlight.current = true;
		setIsLoading(true);

		try {
			// Step 1: Build order with promo handling. Shared with the crypto flow.
			// `clearPromo` is passed as the invalidation callback so a backend
			// promo rejection drops the code from the UI in lockstep with the
			// toast — no stale promo lingering after a server-side invalidation.
			const result = await buildCheckoutOrder({
				raffleId,
				ticketQuantity: quantity,
				promoCode,
				onPromoInvalid: clearPromo,
			});

			// Null means error — already toasted by buildCheckoutOrder.
			if (!result) return;

			// $0 order after promo — backend auto-completed, just refresh.
			if (result.isFullyDiscounted) {
				router.refresh();
				return;
			}

			// Step 2: Create Stripe checkout session and redirect.
			// Backend auto-cancels incompatible sessions — no explicit cancel needed.
			const checkoutResult = await createCheckoutSession({
				orderId: result.order.id,
				publicSlug,
			});

			if (!checkoutResult.success) {
				toast.error(getPaymentErrorMessage(checkoutResult.error));
				return;
			}

			// Defense-in-depth: validate checkout URL origin before redirect.
			// Prevents open redirect if the backend payload is ever compromised.
			const checkoutUrl = new URL(checkoutResult.data.checkoutUrl);
			if (checkoutUrl.origin !== 'https://checkout.stripe.com') {
				console.error('Unexpected checkout URL origin:', checkoutUrl.origin);
				toast.error('Invalid checkout URL. Please try again');
				return;
			}
			window.location.href = checkoutResult.data.checkoutUrl;
		} catch (error) {
			console.error('Unexpected error during checkout:', error);
			toast.error('An unexpected error occurred. Please try again');
		} finally {
			checkoutInFlight.current = false;
			setIsLoading(false);
		}
	}

	return {
		isLoading,
		showQuestionModal,
		setShowQuestionModal,
		initiate,
		handleCorrectAnswer,
	};
}
