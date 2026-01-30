'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapOrderError } from '@/lib/errors/error-mapper';
import type { OrderErrorCode } from '@/types/errors';
import type { OrdersResponse } from '@/types/order';
import { ordersBackendResponseSchema } from '@/types/order';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Pagination params for fetching orders
 */
interface GetMyOrdersParams {
	page?: number;
	limit?: number;
}

/**
 * Creates empty paginated response
 */
function emptyResponse(page: number, limit: number): OrdersResponse {
	return { items: [], limit, page, total: 0, totalPages: 0 };
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
	const { page = 1, limit = 10 } = params;

	try {
		const response = await authenticatedClient.get('/me/orders', {
			params: { page, limit },
			timeout: API_TIMEOUTS.QUERY,
		});

		// Handle empty/null response
		if (!response.data) {
			return success(emptyResponse(page, limit));
		}

		// Parse backend response format { total, orders }
		const result = ordersBackendResponseSchema.safeParse(response.data);
		if (result.success) {
			const { total, orders } = result.data;

			return success({
				items: orders,
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			});
		}

		// Return empty if backend returns unexpected format (graceful degradation)
		return success(emptyResponse(page, limit));
	} catch (error) {
		const errorCode = mapOrderError(error);
		return failure(errorCode);
	}
}
