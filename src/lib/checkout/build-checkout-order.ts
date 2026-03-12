import { toast } from 'sonner';

import {
	getOrderErrorMessage,
	getPromoErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { getReusablePendingOrder } from '@/lib/checkout/get-reusable-pending-order';
import { createOrder } from '@/services/order/create-order';
import { redeemPromoCode } from '@/services/promo-code/redeem-promo-code';
import { validatePromoCode } from '@/services/promo-code/validate-promo-code';
import type { OrderWithRaffle } from '@/types/order';

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
	order: OrderWithRaffle;
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
 * Handles the full order preparation pipeline:
 * 1. Reuse existing pending order if possible (avoids duplicates on retries)
 * 2. Validate promo code if present (catches stale/expired codes before charging)
 * 3. Create new order if none reusable
 * 4. Redeem promo code on order (applies discount or auto-completes if $0)
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

	// Step 1: Check for reusable pending order — avoids creating duplicates
	//         when user retries checkout (e.g. back button, network error)
	let order = await getReusablePendingOrder(
		raffleId,
		ticketQuantity,
		promoCode,
	);

	// Skip promo flow entirely if order already has this promo applied
	const promoAlreadyApplied = promoCode && order?.promoCode === promoCode;

	if (!promoAlreadyApplied) {
		// Step 2: Re-validate promo just before checkout
		//         Catches codes that expired/depleted since user entered them
		if (promoCode) {
			const validationResult = await validatePromoCode(raffleId, promoCode);
			if (!validationResult.success) {
				toast.error(getPromoErrorMessage(validationResult.error));
				if (shouldClearPromo(validationResult.error)) {
					onPromoInvalid?.();
				}
				return null;
			}
		}

		// Step 3: Create order if no reusable one exists
		if (!order) {
			const orderResult = await createOrder({
				raffleId,
				ticketQuantity,
			});

			if (!orderResult.success) {
				toast.error(getOrderErrorMessage(orderResult.error));
				return null;
			}

			order = orderResult.data;
		}

		// Step 4: Apply discount promo to pending order
		if (promoCode) {
			// Guard: different promo already applied — can't swap promos on an order
			if (order.promoCode && order.promoCode !== promoCode) {
				toast.error('A different promo code is already applied to this order');
				onPromoInvalid?.();
				return null;
			}

			// Only redeem if not already applied (idempotency guard)
			if (order.promoCode !== promoCode) {
				const redeemResult = await redeemPromoCode({
					code: promoCode,
					raffleId,
					orderId: order.id,
				});

				if (!redeemResult.success) {
					toast.error(getPromoErrorMessage(redeemResult.error));
					if (shouldClearPromo(redeemResult.error)) {
						onPromoInvalid?.();
					}
					return null;
				}

				// Check if promo made order $0 — backend auto-completes these.
				// Use integer cents to avoid IEEE 754 float imprecision on currency values
				// (e.g. parseFloat("3.30") - parseFloat("3.30") can produce epsilon residuals).
				// >= (not ===) handles 100% discount promos where discount exactly equals order total.
				const discountCents = Math.round(
					parseFloat(redeemResult.data.discountAmount ?? '0') * 100,
				);
				const orderCents = Math.round(parseFloat(order.totalAmount) * 100);

				if (discountCents >= orderCents) {
					toast.success('Promo applied. Tickets claimed successfully!');
					return { order, isFullyDiscounted: true };
				}
			}
		}
	}

	// Final guard — should never hit if logic above is correct
	if (!order) {
		toast.error('Failed to create order. Please try again');
		return null;
	}

	return { order, isFullyDiscounted: false };
}
