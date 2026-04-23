'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { proceedToStripeCheckout } from '@/lib/checkout/proceed-to-stripe-checkout';
import { redeemFreeTickets } from '@/lib/checkout/redeem-free-tickets';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { PROMO_CODE_TYPE } from '@/types/promo-code';

interface TrackInitiateOptions {
	raffleId: string;
	quantity: number;
	promoCode: string | undefined;
	isFreeTicketsPromo: boolean;
}

/**
 * Fires the `TICKET_SELECTION_VIEWED` analytics event before any modal
 * or flow branches, so we capture intent regardless of abandonment
 * downstream.
 */
function trackInitiate({
	raffleId,
	quantity,
	promoCode,
	isFreeTicketsPromo,
}: TrackInitiateOptions): void {
	track(PURCHASE_EVENTS.TICKET_SELECTION_VIEWED, {
		raffle_id: raffleId,
		quantity,
		payment_method: 'stripe',
		has_promo: !!promoCode,
		is_free_tickets: isFreeTicketsPromo,
	});
}

/**
 * Inputs the hook needs from the consuming component to drive the
 * Stripe checkout flow. Quantity and promo state are read from the
 * shared `TicketQuantityStore` so callers don't have to pass them in.
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
	/** Continuation called by `RaffleQuestionModal` after a correct answer. */
	readonly handleCorrectAnswer: () => void;
}

/**
 * Encapsulates the Stripe checkout flow originally embedded in
 * `BuyButton`. The two async heavy-lifters (`redeemFreeTickets`,
 * `proceedToStripeCheckout`) live alongside in `@/lib/checkout/*` so
 * this hook stays an orchestration shell: route between quiz gate,
 * free-tickets redemption, and standard Stripe checkout.
 *
 * Two consumers, two hook instances (card vs sticky):
 *  - The in-card BuyButton lives behind `hidden lg:block` on mobile,
 *    so on mobile the hook still mounts but its UI is offscreen. The
 *    sticky's instance is the one users interact with; on desktop the inverse.
 *  - Each instance has its own `isLoading` (`useState`), but **duplicate
 *    checkout / free-tickets requests are deduped in** `redeemFreeTickets`
 *    and `proceedToStripeCheckout` **at module scope** — not per hook.
 *    Only one of the two instances will show loading while a shared flow runs.
 *
 * @returns Action + state to wire into a button + a question modal.
 */
export function useStripeCheckout(
	params: UseStripeCheckoutParams,
): UseStripeCheckoutResult {
	const { raffleId, publicSlug, questionId, disabled = false } = params;

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const quantity = useTicketQuantityStore(state => state.quantity);
	const appliedPromo = useTicketQuantityStore(state => state.appliedPromo);
	const clearPromo = useTicketQuantityStore(state => state.clearPromo);
	const [isLoading, setIsLoading] = useState(false);
	const [showQuestionModal, setShowQuestionModal] = useState(false);
	const promoCode = appliedPromo?.code;
	const isFreeTicketsPromo =
		appliedPromo?.type === PROMO_CODE_TYPE.FREE_TICKETS;

	function startCheckoutFlow() {
		if (isFreeTicketsPromo && promoCode) {
			void redeemFreeTickets({
				raffleId,
				promoCode,
				pathname,
				searchParams,
				router,
				clearPromo,
				setIsLoading,
			});
			return;
		}
		void proceedToStripeCheckout({
			raffleId,
			publicSlug,
			ticketQuantity: quantity,
			promoCode,
			clearPromo,
			router,
			setIsLoading,
		});
	}

	function initiate() {
		if (disabled || isLoading) return;
		trackInitiate({ raffleId, quantity, promoCode, isFreeTicketsPromo });
		if (questionId) {
			setShowQuestionModal(true);
			return;
		}
		startCheckoutFlow();
	}

	return {
		isLoading,
		showQuestionModal,
		setShowQuestionModal,
		initiate,
		handleCorrectAnswer: startCheckoutFlow,
	};
}
