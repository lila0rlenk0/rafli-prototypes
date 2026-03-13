'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { PaymentErrorCode } from '@/types/errors';

import {
	getCryptoSession,
	type CryptoSessionResponse,
} from './get-crypto-session';

// ==========================================
// Constants
// ==========================================

/**
 * Terminal session statuses that stop polling.
 * Once session reaches 'completed' or 'failed', no further fetches are needed.
 */
const TERMINAL_SESSION_STATUSES = ['completed', 'failed'] as const;

/**
 * Polling interval in milliseconds.
 * 5s balances responsiveness with backend load.
 */
const POLL_INTERVAL_MS = 5_000;

/**
 * Maximum polling duration in milliseconds (5 minutes).
 * Safety net: prevents infinite requests if backend session never transitions.
 */
const MAX_POLL_DURATION_MS = 5 * 60 * 1_000;

/** Query key for crypto session polling — exported for cache invalidation */
export function pollCryptoSessionKey(sessionId: string | null) {
	return ['payment', 'crypto-session', 'poll', sessionId] as const;
}

// ==========================================
// Hook
// ==========================================

/**
 * Checks if session has reached a terminal status
 */
function isTerminalSessionStatus(status: string | undefined): boolean {
	if (!status) return false;
	return TERMINAL_SESSION_STATUSES.includes(
		status as (typeof TERMINAL_SESSION_STATUSES)[number],
	);
}

/**
 * Polls crypto session status via GET /payments/crypto/sessions/:id.
 *
 * Provides authoritative session state from backend including `failureReason`
 * (which the order endpoint does not expose). Used alongside FE on-chain
 * confirmation tracking to detect backend-side failures.
 *
 * Stops when:
 * 1. Session reaches completed/failed (normal path)
 * 2. MAX_POLL_DURATION_MS exceeded (safety net)
 *
 * @param sessionId - Crypto session ID (pass null to disable polling)
 * @returns React Query result with session data and `isExpired` flag
 */
export function usePollCryptoSession(sessionId: string | null) {
	// Tracks when polling started — only read inside refetchInterval (not render)
	const startedAtRef = useRef<number>(0);

	// isExpired is render-visible state — only set asynchronously via setTimeout
	const [isExpired, setIsExpired] = useState(false);

	// Initialize/reset start time when sessionId changes
	useEffect(() => {
		if (!sessionId) {
			startedAtRef.current = 0;
			return;
		}

		startedAtRef.current = Date.now();

		const timer = setTimeout(() => {
			setIsExpired(true);
		}, MAX_POLL_DURATION_MS);

		return function cleanup() {
			clearTimeout(timer);
			setIsExpired(false);
		};
	}, [sessionId]);

	const query = useQuery<CryptoSessionResponse, ServiceError<PaymentErrorCode>>(
		{
			queryKey: pollCryptoSessionKey(sessionId),
			queryFn: async function pollSession() {
				if (!sessionId) throw serviceError('fetch_failed' as PaymentErrorCode);

				const result = await getCryptoSession(sessionId);
				if (!result.success) throw serviceError(result.error);
				return result.data;
			},
			enabled: !!sessionId,
			// Polling itself is already the retry strategy.
			// Disable hidden React Query retries so one failed read does not stack
			// extra session requests on top of the next scheduled poll tick.
			retry: false,
			// Poll every 5s, stop on terminal status or timeout
			refetchInterval(q) {
				if (isTerminalSessionStatus(q.state.data?.status)) return false;

				if (startedAtRef.current > 0) {
					const elapsed = Date.now() - startedAtRef.current;
					if (elapsed >= MAX_POLL_DURATION_MS) return false;
				}

				return POLL_INTERVAL_MS;
			},
		},
	);

	return {
		...query,
		isExpired: isExpired && !isTerminalSessionStatus(query.data?.status),
	};
}
