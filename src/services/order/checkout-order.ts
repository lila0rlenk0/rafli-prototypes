'use server';

import { ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { mapOrderError } from '@/lib/errors/error-mapper';
import { ORDER_ERROR_CODES, type OrderErrorCode } from '@/types/errors';
import { orderSchema, type Order } from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Schema
// ==========================================

/**
 * Schema for atomic checkout response.
 *
 * Backend returns a flat order object (not nested under `order` key)
 * with an optional `promoRedemption` field. Fields not in orderSchema
 * (like promoRedemption) are silently stripped by Zod's default behavior.
 */
const checkoutOrderResponseSchema = orderSchema;

// ==========================================
// Types
// ==========================================

/** Payload for the atomic checkout endpoint — validated server-side, no FE schema needed */
export interface CheckoutOrderPayload {
	raffleId: string;
	ticketQuantity: number;
	promoCode?: string;
}

/** Parsed checkout response — order + derived fully-discounted flag */
export interface CheckoutOrderResponse {
	order: Order;
	/** True when totalAmount is zero — promo covered entire order, backend auto-completed */
	isFullyDiscounted: boolean;
}

// ==========================================
// Helpers
// ==========================================

/**
 * Derives whether the order was fully discounted from the totalAmount field.
 * Backend returns totalAmount as a decimal string (e.g. "0.0000" for free orders).
 *
 * @param order - Validated order from checkout response
 * @returns True when totalAmount parses to exactly 0
 */
function isOrderFullyDiscounted(order: Order): boolean {
	return parseFloat(order.totalAmount) === 0;
}

// ==========================================
// Server Action
// ==========================================

/**
 * Atomically creates or reuses a checkout order with promo handling.
 *
 * Replaces the previous 4-step waterfall (find reusable order → validate promo
 * → create order → redeem promo) with a single backend transaction.
 * Backend handles order reuse, promo validation, and redemption atomically.
 *
 * @param payload - Raffle ID, ticket quantity, optional promo code
 * @returns ServiceResponse with order and discount info, or error code
 */
export async function checkoutOrder(
	payload: CheckoutOrderPayload,
): Promise<ServiceResponse<CheckoutOrderResponse, OrderErrorCode>> {
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			'/orders/checkout',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Backend returns flat order object — validate and derive isFullyDiscounted
		const order = checkoutOrderResponseSchema.parse(response.data);

		// Track order created
		await trackServer(
			PURCHASE_EVENTS.ORDER_CREATED,
			{
				order_id: order.id,
				raffle_id: payload.raffleId,
				quantity: payload.ticketQuantity,
			},
			{ userId },
		);

		return success({
			order,
			isFullyDiscounted: isOrderFullyDiscounted(order),
		});
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Checkout order response validation failed:', error);
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapOrderError(error);

		await trackServer(
			PURCHASE_EVENTS.ORDER_FAILED,
			{ raffle_id: payload.raffleId, error_code: errorCode },
			{ userId },
		);

		return failure(errorCode);
	}
}
