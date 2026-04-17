import { toast } from 'sonner';

import {
	getOrderErrorMessage,
	getPromoErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { checkoutOrder } from '@/services/order/checkout-order';
import type { Order } from '@/types/order';

// ==========================================
// Types
// ==========================================

/**
 * Params for building a checkout order
 */
export interface BuildCheckoutOrderParams {
	raffleId: string;
	ticketQuantity: number;
	promoCode?: string;
	/** Called when promo code is invalid and should be cleared from UI */
	onPromoInvalid?: () => void;
}

/**
 * Result of a successful checkout order build
 */
export interface BuildCheckoutOrderResult {
	order: Order;
	/** True if promo made order $0 and backend auto-completed it */
	isFullyDiscounted: boolean;
}

// ==========================================
// Main Function
// ==========================================

/**
 * Builds a checkout order with promo code handling.
 *
 * Shared between Stripe (BuyButton) and crypto (CryptoBuyButton) flows.
 * Backend atomically handles order reuse, promo validation, and redemption
 * in a single POST /orders/checkout call.
 *
 * Shows toast errors internally — caller doesn't need to handle error display.
 *
 * @param params - Order build parameters
 * @returns Order result, or null if an error occurred (already toasted)
 */
export async function buildCheckoutOrder(
	params: BuildCheckoutOrderParams,
): Promise<BuildCheckoutOrderResult | null> {
	const { raffleId, ticketQuantity, promoCode, onPromoInvalid } = params;

	// Step 1: Call backend to create/reuse order with optional promo code.
	const result = await checkoutOrder({
		raffleId,
		ticketQuantity,
		promoCode,
	});

	// Step 2: Handle failure — show appropriate toast and optionally clear promo UI.
	// The atomic checkout endpoint surfaces `core:promo:*` errors when the attached
	// code fails validation inside the order transaction. Route them through the
	// promo message map; everything else gets a generic order-error message.
	if (!result.success) {
		const clearPromo = shouldClearPromo(result.error);
		const isPromoError =
			!!promoCode && (result.error.startsWith('core:promo:') || clearPromo);

		if (isPromoError) {
			toast.error(getPromoErrorMessage(result.error));
			if (clearPromo) onPromoInvalid?.();
		} else {
			toast.error(getOrderErrorMessage(result.error));
		}
		return null;
	}

	// Step 3: Notify on fully-discounted orders (promo covered 100% of the price).
	if (result.data.isFullyDiscounted) {
		toast.success('Promo applied. Tickets claimed successfully!');
	}

	return {
		order: result.data.order,
		isFullyDiscounted: result.data.isFullyDiscounted,
	};
}
