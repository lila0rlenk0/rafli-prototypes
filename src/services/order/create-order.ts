'use server';

import { runAfter } from '@/lib/run-after';
import { ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapOrderError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { ORDER_ERROR_CODES, type OrderErrorCode } from '@/types/errors';
import type { CreateOrderPayload, Order } from '@/types/order';
import { createOrderPayloadSchema, orderSchema } from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Creates a new pending order for ticket purchase
 *
 * @param payload - Order creation data (raffleId, ticketQuantity, optional promoCode)
 * @returns ServiceResponse with created order on success, OrderErrorCode on failure
 */
export async function createOrder(
	payload: CreateOrderPayload,
): Promise<ServiceResponse<Order, OrderErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Validate payload — reject invalid quantity before network call
		const validationResult = createOrderPayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(ORDER_ERROR_CODES.INVALID_QUANTITY);
		}

		// Step 2: Create pending order on backend
		const response = await authenticatedClient.post(
			'/orders',
			validationResult.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate response shape
		const order = orderSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.ORDER_CREATED,
				{
					order_id: order.id,
					raffle_id: payload.raffleId,
					quantity: payload.ticketQuantity,
					has_promo: !!payload.promoCode,
					total_amount: order.totalAmount,
				},
				{ userId },
			);
		});

		return success(order);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'order', 'create-order');
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapOrderError(error);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.ORDER_FAILED,
				{ raffle_id: payload.raffleId, error_code: errorCode },
				{ userId },
			);
		});

		return failure(errorCode);
	}
}
