'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapOrderError } from '@/lib/errors/error-mapper';
import { ORDER_ERROR_CODES, type OrderErrorCode } from '@/types/errors';
import type { OrdersResponse } from '@/types/order';
import { ordersBackendResponseSchema } from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Pagination params for fetching orders
 */
interface GetMyOrdersParams {
	page?: number;
	limit?: number;
	/** When true, backend filters out stale pending orders (abandoned, expired sessions) */
	excludeStale?: boolean;
}

/**
 * Fetches the current user's orders with pagination
 *
 * @param params - Pagination parameters
 * @returns ServiceResponse with paginated orders on success, OrderErrorCode on failure
 */
export async function getMyOrders(
	params: GetMyOrdersParams = {},
): Promise<ServiceResponse<OrdersResponse, OrderErrorCode>> {
	const { page = 1, limit = 10, excludeStale } = params;

	try {
		const response = await authenticatedClient.get('/me/orders', {
			params: {
				page,
				limit,
				...(excludeStale && { excludeStale: true }),
			},
			timeout: API_TIMEOUTS.QUERY,
		});

		// Checkout order reuse depends on this response being trustworthy.
		// Treat null/missing payloads as fetch failures instead of "no orders",
		// otherwise degraded `/me/orders` responses can create duplicate orders.
		if (!response.data) {
			console.error('Orders response missing data:', { page, limit });
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		// Parse backend response format { total, orders }
		const result = ordersBackendResponseSchema.safeParse(response.data);
		if (!result.success) {
			// Invalid shape means the caller cannot safely distinguish "no orders"
			// from "orders exist but the payload drifted". Fail closed and let callers
			// decide whether creating new orders is still safe.
			console.error('Orders response validation failed:', result.error);
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		const { total, orders } = result.data;

		return success({
			items: orders,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		return failure(mapOrderError(error));
	}
}
