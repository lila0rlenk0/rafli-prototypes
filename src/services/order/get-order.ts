'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapOrderError } from '@/lib/errors/error-mapper';
import { captureContractDrift } from '@/lib/sentry/capture';
import { ORDER_ERROR_CODES, type OrderErrorCode } from '@/types/errors';
import type { Order } from '@/types/order';
import { orderSchema } from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching a single order
 */
type GetOrderResponse = ServiceResponse<Order, OrderErrorCode>;

/**
 * Fetches a single order by ID
 * Used for polling order status after payment
 *
 * @param orderId - The UUID of the order to fetch
 * @returns ServiceResponse with order data on success, OrderErrorCode on failure
 */
export async function getOrder(orderId: string): Promise<GetOrderResponse> {
	try {
		const response = await authenticatedClient.get(
			`/orders/${encodeURIComponent(orderId)}`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		// Validate response structure
		const order = orderSchema.parse(response.data);

		return success(order);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			captureContractDrift(error, 'order', 'get-order');
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapOrderError(error);
		return failure(errorCode);
	}
}
