'use server';

import { z, ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { mapOrderError } from '@/lib/errors/error-mapper';
import { ORDER_ERROR_CODES, type OrderErrorCode } from '@/types/errors';
import { orderSchema } from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Schema
// ==========================================

/**
 * Schema for atomic checkout response.
 * Backend atomically finds/creates order + validates/redeems promo.
 */
const checkoutOrderResponseSchema = z.object({
	order: orderSchema,
	/** True when promo covered the full order amount — backend auto-completed the order */
	isFullyDiscounted: z.boolean(),
});

// ==========================================
// Types
// ==========================================

/** Payload for the atomic checkout endpoint — validated server-side, no FE schema needed */
export interface CheckoutOrderPayload {
	raffleId: string;
	ticketQuantity: number;
	promoCode?: string;
}

/** Response from the atomic checkout endpoint */
export type CheckoutOrderResponse = z.infer<typeof checkoutOrderResponseSchema>;

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

		const data = checkoutOrderResponseSchema.parse(response.data);

		// Track order created
		await trackServer(
			PURCHASE_EVENTS.ORDER_CREATED,
			{
				order_id: data.order.id,
				raffle_id: payload.raffleId,
				quantity: payload.ticketQuantity,
			},
			{ userId },
		);

		return success(data);
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
