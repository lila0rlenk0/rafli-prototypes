'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { failure, mapOrderError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
		// Step 1: Fetch paginated orders from backend
		const response = await authenticatedClient.get('/me/orders', {
			params: {
				page,
				limit,
				...(excludeStale && { excludeStale: true }),
			},
			timeout: API_TIMEOUTS.QUERY,
		});

		// Step 2: Guard — null/missing payloads would mask "no orders" vs degraded backend.
		// Checkout order reuse depends on this response being trustworthy — fail closed.
		if (!response.data) {
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		// Step 3: Validate with safeParse — invalid shape means payload drifted,
		// callers can't safely distinguish "no orders" from broken contract
		const result = ordersBackendResponseSchema.safeParse(response.data);
		if (!result.success) {
			captureContractDrift(result.error, 'order', 'get-my-orders');
			return failure(ORDER_ERROR_CODES.FETCH_FAILED);
		}

		// Step 4: Map to frontend response shape — use BE pagination values directly
		return success({
			items: result.data.orders,
			total: result.data.total,
			page: result.data.page,
			limit: result.data.limit,
			totalPages: result.data.totalPages,
		});
	} catch (error) {
		return failure(mapOrderError(error));
	}
}
