'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import { ORDER_ERROR_CODES, type OrderErrorCode } from '@/types/errors';
import type { Order } from '@/types/order';

import { getOrder } from './get-order';

/**
 * Query key for a single-order fetch. `null` orderId still produces a
 * stable key so the hook can be wired with `enabled: false` while waiting
 * for the id without React Query re-keying when the value flips.
 *
 * @returns Stable query-key tuple
 */
export function orderKey(orderId: string | null) {
	return ['order', orderId] as const;
}

interface UseOrderOptions {
	enabled?: boolean;
}

/**
 * React Query hook for a single order. Used by the Stripe-return
 * celebration to source the `ticketQuantity` once verification settles.
 * Disabled until an id is available; `enabled` lets the caller hold the
 * fetch back until the Stripe poll resolves to paid.
 *
 * @returns React Query result with the order, or null when no id yet
 */
export function useOrder(orderId: string | null, options?: UseOrderOptions) {
	return useQuery<Order, ServiceError<OrderErrorCode>>({
		queryKey: orderKey(orderId),
		queryFn: async function fetchOrder() {
			// Type guard — `enabled: orderId !== null` keeps the queryFn from
			// running when null, but the type system still sees the nullable
			// union here. Throw FETCH_FAILED so React Query records a typed
			// error in the unreachable branch.
			if (orderId === null) {
				throw serviceError(ORDER_ERROR_CODES.FETCH_FAILED);
			}
			const result = await getOrder(orderId);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: orderId !== null && (options?.enabled ?? true),
	});
}
