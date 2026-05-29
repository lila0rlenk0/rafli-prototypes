'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { failure, mapOrderError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { pathParam } from '@/lib/utils/routing/path-param';
import { ORDER_ERROR_CODES, type OrderErrorCode } from '@/types/errors';
import type { Order } from '@/types/order';
import { orderSchema } from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Fetches a single order by ID.
 * Used for polling order status after payment.
 *
 * @param orderId - The UUID of the order to fetch
 * @returns ServiceResponse with order data on success, OrderErrorCode on failure
 */
export async function getOrder(
	orderId: string,
): Promise<ServiceResponse<Order, OrderErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/orders/${pathParam(orderId)}`,
			{ timeout: API_TIMEOUTS.QUERY },
		);
		return success(orderSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'order', 'get-order');
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapOrderError(error));
	}
}
