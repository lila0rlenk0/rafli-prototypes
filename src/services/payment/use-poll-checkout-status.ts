'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { PaymentErrorCode } from '@/types/errors';
import { CHECKOUT_PHASE, type CheckoutStatus } from '@/types/checkout-status';

import { getCheckoutStatus } from './get-checkout-status';

// ==========================================
// Constants
// ==========================================

/**
 * Terminal checkout phases that stop polling.
 * Once checkout reaches one of these, no further fetches are needed.
 *
 * Must match BE `CheckoutPhase` terminal values exactly.
 */
const TERMINAL_PHASES = [
	CHECKOUT_PHASE.COMPLETED,
	CHECKOUT_PHASE.FAILED,
] as const;

/**
 * Polling interval in milliseconds.
 * 5s balances responsiveness with backend load — fast enough for a good UX,
 * slow enough to avoid hammering the endpoint during extended confirmations.
 */
const POLL_INTERVAL_MS = 5_000;

/**
 * Maximum polling duration in milliseconds (5 minutes).
 * Safety net: if checkout never reaches terminal phase, stop polling to prevent
 * infinite requests. The session expiry timer in the modal handles the UX side.
 */
const DEFAULT_MAX_POLL_DURATION_MS = 5 * 60 * 1_000;

// ==========================================
// Helpers
// ==========================================

/**
 * Query key for checkout status polling — exported for cache invalidation.
 *
 * @param orderId - Order being polled, or null when polling is disabled
 * @returns Tuple query key for React Query
 */
export function pollCheckoutStatusKey(orderId: string | null) {
	return ['checkout-status', 'poll', orderId] as const;
}

/** Checks if checkout has reached a terminal phase recognized by the FE */
function isTerminalPhase(phase: string | undefined): boolean {
	if (!phase) return false;
	return (TERMINAL_PHASES as readonly string[]).includes(phase);
}

// ==========================================
// Hook
// ==========================================

/**
 * Polls unified checkout status every 5s until terminal phase or timeout.
 *
 * Replaces both `usePollOrderStatus` and `usePollCryptoSession` with a single
 * polling loop against GET /payments/checkout-status/:orderId.
 * Backend returns `phase`, `canRetry`, `canSwitchMethod`, and merged session data.
 *
 * Stops when:
 * 1. Phase reaches completed/failed (normal path)
 * 2. MAX_POLL_DURATION_MS exceeded (safety net)
 *
 * @param orderId - Order to poll (pass null to disable)
 * @param maxDurationMs - Optional max polling window (default 5min)
 * @returns React Query result with checkout status and `isExpired` flag
 */
export function usePollCheckoutStatus(
	orderId: string | null,
	maxDurationMs?: number,
) {
	const resolvedMaxDurationMs = maxDurationMs ?? DEFAULT_MAX_POLL_DURATION_MS;

	// Tracks when polling started — only read inside refetchInterval (not render).
	// Reset when orderId OR maxDurationMs changes so the elapsed-time guard in
	// refetchInterval stays aligned with the setTimeout-based isExpired below.
	const startedAtRef = useRef<number>(0);

	// isExpired is render-visible state — only set asynchronously via setTimeout
	const [isExpired, setIsExpired] = useState(false);

	// Combined init + timer effect keyed on both orderId and maxDuration.
	// Both startedAtRef reset and setTimeout use the same trigger set, so the
	// refetchInterval elapsed guard and the render-visible isExpired flag always
	// agree on when polling should stop.
	//
	// Restarting when maxDurationMs changes is intentional — switching from
	// submitDeadline to confirmDeadline (post-tx) should push back the timeout.
	useEffect(() => {
		if (!orderId) {
			startedAtRef.current = 0;
			return;
		}

		startedAtRef.current = Date.now();

		const timer = setTimeout(() => {
			setIsExpired(true);
		}, resolvedMaxDurationMs);

		return function cleanup() {
			clearTimeout(timer);
			setIsExpired(false);
		};
	}, [orderId, resolvedMaxDurationMs]);

	const query = useQuery<CheckoutStatus, ServiceError<PaymentErrorCode>>({
		queryKey: pollCheckoutStatusKey(orderId),
		queryFn: async function pollCheckoutStatus() {
			// orderId is guaranteed non-null by enabled: !!orderId above
			const result = await getCheckoutStatus(orderId!);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: !!orderId,
		// Polling itself is already the retry strategy — disable hidden retries
		retry: false,
		refetchInterval: function computeRefetchInterval(q) {
			// Step 1: Stop on terminal phase
			if (isTerminalPhase(q.state.data?.phase)) return false;

			// Step 2: Stop after max duration
			if (startedAtRef.current > 0) {
				const elapsed = Date.now() - startedAtRef.current;
				if (elapsed >= resolvedMaxDurationMs) return false;
			}

			return POLL_INTERVAL_MS;
		},
	});

	return {
		...query,
		isExpired: isExpired && !isTerminalPhase(query.data?.phase),
	};
}
