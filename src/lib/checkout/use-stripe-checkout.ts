'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { proceedToStripeCheckout } from '@/lib/checkout/proceed-to-stripe-checkout';
import { redeemFreeTickets } from '@/lib/checkout/redeem-free-tickets';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';
import { PROMO_CODE_TYPE } from '@/types/promo-code';

interface RunCheckoutFlowParams {
	isFreeTicketsPromo: boolean;
	promoCode: string | undefined;
	raffleId: string;
	publicSlug: string;
	quantity: number;
	expectedTotal: number;
	pathname: string;
	searchParams: ReturnType<typeof useSearchParams>;
	router: AppRouterInstance;
	clearPromo: () => void;
	setIsLoading: (loading: boolean) => void;
}

/**
 * Routes a click between the BE-direct free-tickets redemption and the
 * standard Stripe checkout flow. Both downstreams own module-scope
 * single-flight guards, so this is pure routing.
 */
interface TrackSelectionParams {
	raffleId: string;
	quantity: number;
	hasPromo: boolean;
	isFreeTickets: boolean;
}

function trackTicketSelection(p: TrackSelectionParams): void {
	track(PURCHASE_EVENTS.TICKET_SELECTION_VIEWED, {
		raffle_id: p.raffleId,
		quantity: p.quantity,
		payment_method: 'stripe',
		has_promo: p.hasPromo,
		is_free_tickets: p.isFreeTickets,
	});
}

function runCheckoutFlow(p: RunCheckoutFlowParams): void {
	if (p.isFreeTicketsPromo && p.promoCode) {
		void redeemFreeTickets({
			raffleId: p.raffleId,
			promoCode: p.promoCode,
			pathname: p.pathname,
			searchParams: p.searchParams,
			router: p.router,
			clearPromo: p.clearPromo,
			setIsLoading: p.setIsLoading,
		});
		return;
	}
	void proceedToStripeCheckout({
		raffleId: p.raffleId,
		publicSlug: p.publicSlug,
		ticketQuantity: p.quantity,
		promoCode: p.promoCode,
		clearPromo: p.clearPromo,
		router: p.router,
		setIsLoading: p.setIsLoading,
		expectedTotal: p.expectedTotal,
	});
}

/**
 * Inputs the hook needs from the consuming component to drive the
 * Stripe checkout flow. Quantity and promo state are read from the
 * shared `TicketQuantityStore` so callers don't have to pass them in.
 */
interface UseStripeCheckoutParams {
	raffleId: string;
	publicSlug: string;
	/** Optional quiz question that gates the purchase. */
	questionId?: string | null;
	/** Disabled by parent (host viewing own raffle, etc.) — short-circuits the action. */
	disabled?: boolean;
	/**
	 * Displayed total at click time — forwarded to `proceedToStripeCheckout` for
	 * the subscriber-pricing drift guard. Caller computes via `calculateOrderTotal`
	 * so this hook stays free of math + subscription wiring.
	 */
	expectedTotal: number;
}

interface UseStripeCheckoutResult {
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
	const {
		raffleId,
		publicSlug,
		questionId,
		disabled = false,
		expectedTotal,
	} = params;
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

	function runFlow() {
		runCheckoutFlow({
			isFreeTicketsPromo,
			promoCode,
			raffleId,
			publicSlug,
			quantity,
			expectedTotal,
			pathname,
			searchParams,
			router,
			clearPromo,
			setIsLoading,
		});
	}

	function initiate() {
		if (disabled || isLoading) return;
		// Fire intent before any branch so we capture abandonment downstream.
		trackTicketSelection({
			raffleId,
			quantity,
			hasPromo: !!promoCode,
			isFreeTickets: isFreeTicketsPromo,
		});
		if (questionId) {
			setShowQuestionModal(true);
			return;
		}
		runFlow();
	}

	return {
		isLoading,
		showQuestionModal,
		setShowQuestionModal,
		initiate,
		handleCorrectAnswer: runFlow,
	};
}
