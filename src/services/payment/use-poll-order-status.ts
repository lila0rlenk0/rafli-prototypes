'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

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
 * 5s balances responsiveness with backend load — fast enough for a good UX,
 * slow enough to avoid hammering the endpoint during extended confirmations
 */
const POLL_INTERVAL_MS = 5_000;

/**
 * Maximum polling duration in milliseconds (5 minutes).
 * Safety net: if order never reaches terminal state (e.g. backend stuck,
 * session expired but order not moved to FAILED), stop polling to prevent
 * infinite requests. The session expiry timer in the modal handles the UX side.
 */
const DEFAULT_MAX_POLL_DURATION_MS = 5 * 60 * 1_000;

/** Query key for order status polling — exported for cache invalidation/prefetching */
export function pollOrderStatusKey(orderId: string | null) {
	return ['order', 'poll', orderId] as const;
}

/**
 * Checks if order has reached a terminal status
 */
function isTerminalStatus(status: string | undefined): boolean {
	if (!status) return false;
	return TERMINAL_STATUSES.includes(
		status as (typeof TERMINAL_STATUSES)[number],
	);
}

/**
 * Polls order status every 5 seconds until terminal state or timeout
 *
 * Used after crypto tx submission to track backend confirmation.
 * Stops when:
 * 1. Order reaches completed/failed/refunded (normal path)
 * 2. MAX_POLL_DURATION_MS exceeded (safety net — prevents infinite polling
 *    if backend never transitions order to terminal state)
 *
 * @param orderId - The order to poll (pass null to disable polling)
 * @returns React Query result with order data and `isExpired` flag
 */
export function usePollOrderStatus(
	orderId: string | null,
	maxDurationMs?: number,
) {
	const resolvedMaxDurationMs = maxDurationMs ?? DEFAULT_MAX_POLL_DURATION_MS;

	// Tracks when polling started — read only inside refetchInterval callback
	// (not during render), so it's safe as a ref for the Date.now() check there.
	const startedAtRef = useRef<number>(0);

	// isExpired is state (not a ref) because callers read it during render.
	// Only set to true asynchronously via setTimeout — never synchronously in the effect body.
	const [isExpired, setIsExpired] = useState(false);

	// Initialize/reset start time when orderId changes.
	// The synchronous reset of startedAtRef is fine — refs can be written in effects.
	// isExpired is only set asynchronously via the timer callback (not synchronously),
	// which satisfies the react-hooks/set-state-in-effect rule.
	useEffect(() => {
		if (!orderId) {
			startedAtRef.current = 0;
			return;
		}

		startedAtRef.current = Date.now();

		// Schedule expiry — fires once after MAX_POLL_DURATION_MS.
		// Async setState in timer callback is allowed (not synchronous in effect body).
		const timer = setTimeout(() => {
			setIsExpired(true);
		}, resolvedMaxDurationMs);

		return function cleanup() {
			clearTimeout(timer);
			setIsExpired(false);
		};
	}, [orderId, resolvedMaxDurationMs]);

	const query = useQuery<Order, ServiceError<OrderErrorCode>>({
		queryKey: pollOrderStatusKey(orderId),
		queryFn: async function pollOrder() {
			if (!orderId) throw serviceError('fetch_failed' as OrderErrorCode);

			const result = await getOrder(orderId);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: !!orderId,
		// Polling itself is already the retry strategy.
		// Disable hidden React Query retries so one slow backend response doesn't
		// multiply into extra requests on top of the next scheduled interval.
		retry: false,
		// Poll every 5s, stop on terminal status or timeout.
		// refetchInterval is a callback invoked by React Query (not during render),
		// so Date.now() and ref reads are safe here.
		refetchInterval: function computeRefetchInterval(q) {
			// Step 1: Stop on terminal status
			if (isTerminalStatus(q.state.data?.status)) return false;

			// Step 2: Stop after the caller-defined max duration — prevents
			// infinite polling while still letting crypto flows match the
			// backend's longer post-expiry grace windows when needed.
			// when backend never moves order to terminal state
			if (startedAtRef.current > 0) {
				const elapsed = Date.now() - startedAtRef.current;
				if (elapsed >= resolvedMaxDurationMs) return false;
			}

			return POLL_INTERVAL_MS;
		},
	});

	return {
		...query,
		isExpired: isExpired && !isTerminalStatus(query.data?.status),
	};
}
