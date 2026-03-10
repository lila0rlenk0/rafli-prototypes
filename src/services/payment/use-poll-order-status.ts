'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { OrderErrorCode } from '@/types/errors';
import type { Order } from '@/types/order';
import { ORDER_STATUS } from '@/types/order';

import { getOrder } from '../order/get-order';

/**
 * Terminal order statuses that stop polling
 * Once order reaches one of these, no further fetches are needed
 */
const TERMINAL_STATUSES = [
	ORDER_STATUS.COMPLETED,
	ORDER_STATUS.FAILED,
	ORDER_STATUS.REFUNDED,
] as const;

/**
 * Polling interval in milliseconds
 * 3s balances responsiveness with backend load
 */
const POLL_INTERVAL_MS = 3_000;

/** Query key for order status polling — exported for cache invalidation/prefetching */
export function pollOrderStatusKey(orderId: string | null) {
	return ['order', 'poll', orderId] as const;
}

/**
 * Polls order status every 3 seconds until terminal state
 *
 * Used after crypto tx submission to track backend confirmation.
 * Automatically stops when order reaches completed/failed/refunded.
 *
 * @param orderId - The order to poll (pass null to disable polling)
 * @returns React Query result with order data
 */
export function usePollOrderStatus(orderId: string | null) {
	return useQuery<Order, ServiceError<OrderErrorCode>>({
		queryKey: pollOrderStatusKey(orderId),
		queryFn: async function pollOrder() {
			if (!orderId) throw serviceError('fetch_failed' as OrderErrorCode);

			const result = await getOrder(orderId);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: !!orderId,
		// Poll every 3s, stop when terminal status reached
		refetchInterval(query) {
			const status = query.state.data?.status;
			if (
				status &&
				TERMINAL_STATUSES.includes(status as (typeof TERMINAL_STATUSES)[number])
			) {
				return false; // Stop polling
			}
			return POLL_INTERVAL_MS;
		},
	});
}
