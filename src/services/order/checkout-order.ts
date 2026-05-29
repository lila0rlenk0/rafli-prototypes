'use server';

import { ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
// Import mapper from the module — not `@/lib/errors` barrel — so `spyOn` / load order
// on checkout-adjacent tests cannot create a half-initialized re-export (TDZ on mapper).
import { mapCheckoutOrderError } from '@/lib/errors/error-mapper';
import { failure, success } from '@/lib/errors/service-result';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	COMMON_ERROR_CODES,
	type CheckoutOrderErrorCode,
} from '@/types/errors';
import {
	createOrderPayloadSchema,
	orderSchema,
	type CreateOrderPayload,
	type Order,
} from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';

/** Payload for the checkout order request — inferred from Zod schema in types/order.ts */
export type CheckoutOrderPayload = CreateOrderPayload;

/** Parsed checkout response — order + derived fully-discounted flag */
export interface CheckoutOrderResponse {
	order: Order;
	/** True when totalAmount is zero — promo covered entire order, backend auto-completed */
	isFullyDiscounted: boolean;
}

/**
 * Atomically creates or reuses a checkout order with promo handling.
 *
 * Replaces the previous 4-step waterfall (find reusable order → validate promo
 * → create order → redeem promo) with a single backend transaction.
 * Backend handles order reuse, promo validation, and redemption atomically.
 *
 * Backend returns a flat order object (not nested under `order` key)
 * with an optional `promoRedemption` field stripped by Zod's default behavior.
 *
 * Error surface spans `core:order:*`, `core:raffle:*`, and `core:promo:*` —
 * promo errors arise when the attached code fails validation inside the order
 * transaction. Callers route them through `shouldClearPromo` / `getPromoErrorMessage`.
 *
 * @param payload - Raffle ID, ticket quantity, optional promo code
 * @returns ServiceResponse with order and discount info, or error code
 */
export async function checkoutOrder(
	payload: CheckoutOrderPayload,
): Promise<ServiceResponse<CheckoutOrderResponse, CheckoutOrderErrorCode>> {
	const sessionPromise = import('@/lib/auth/session').then(m => m.getSession());

	try {
		// Step 1: Validate input — defense-in-depth before forwarding to backend
		const parsed = createOrderPayloadSchema.safeParse(payload);
		if (!parsed.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Create or reuse checkout order atomically — backend handles promo & reuse
		const response = await authenticatedClient.post(
			'/orders/checkout',
			parsed.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate response shape
		const order = orderSchema.parse(response.data);

		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			PURCHASE_EVENTS.ORDER_CREATED,
			{
				order_id: order.id,
				raffle_id: payload.raffleId,
				quantity: payload.ticketQuantity,
				has_promo: !!payload.promoCode,
				total_amount: order.totalAmount,
				is_fully_discounted: parseFloat(order.totalAmount) === 0,
			},
			{ userId },
		);

		return success({
			order,
			// Backend returns totalAmount as decimal string — "0.0000" means promo covered entire order
			isFullyDiscounted: parseFloat(order.totalAmount) === 0,
		});
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'order', 'checkout-order');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		const errorCode = mapCheckoutOrderError(error);

		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			PURCHASE_EVENTS.ORDER_FAILED,
			{ raffle_id: payload.raffleId, error_code: errorCode },
			{ userId },
		);

		return failure(errorCode);
	}
}
