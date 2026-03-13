'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { TicketErrorCode } from '@/types/errors';
import type { TicketCodesResponse } from '@/types/ticket';

import { getMyTicketCodes } from './get-my-ticket-codes';

// ==========================================
// Constants
// ==========================================

/**
 * Ticket issuance happens asynchronously after order completion.
 * Poll every 10s so the UI catches up without turning one purchase into a burst
 * of ticket-ledger reads.
 */
const POLL_INTERVAL_MS = 10_000;

/**
 * Safety net: stop after 1 minute.
 * Ticket issuance should be quick; after that, extra polling has low UX value and
 * mostly burns backend reads. The caller still does one final refresh on timeout.
 */
const MAX_POLL_DURATION_MS = 60 * 1_000;

// ==========================================
// Query Key
// ==========================================

/** Query key for post-payment ticket sync polling */
export function pollMyTicketCodesKey(
	raffleId: string | null,
	targetTotal: number | null,
) {
	return ['ticket-codes', 'poll', raffleId, targetTotal] as const;
}

// ==========================================
// Hook
// ==========================================

/**
 * Poll the authenticated user's ticket codes for a raffle until the expected
 * total is visible.
 *
 * Why this exists:
 * - Crypto success currently means "order completed"
 * - Ticket issuance happens asynchronously afterward
 * - A single router.refresh() can therefore land before the new codes exist
 *
 * The caller passes the total they expect after purchase. We stop when the
 * endpoint reports that total, or after the max-duration safety net.
 *
 * Backend-load constraints:
 * - request only `limit=1` because we only care about `total`
 * - disable focus/reconnect refetches so polling cadence stays predictable
 * - disable retries to avoid hidden duplicate traffic on transient failures
 */
export function usePollMyTicketCodes(
	raffleId: string | null,
	targetTotal: number | null,
) {
	const startedAtRef = useRef<number>(0);
	const [isExpired, setIsExpired] = useState(false);

	useEffect(() => {
		if (!raffleId || targetTotal === null) {
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
	}, [raffleId, targetTotal]);

	const query = useQuery<TicketCodesResponse, ServiceError<TicketErrorCode>>({
		queryKey: pollMyTicketCodesKey(raffleId, targetTotal),
		queryFn: async function pollTicketCodes() {
			if (!raffleId) throw serviceError('fetch_failed' as TicketErrorCode);

			const result = await getMyTicketCodes({ raffleId, limit: 1, page: 1 });
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: !!raffleId && targetTotal !== null,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		retry: false,
		refetchInterval(q) {
			const currentTotal = q.state.data?.total;

			// Stop once the page's "My Tickets" source-of-truth has caught up.
			if (targetTotal !== null && currentTotal !== undefined) {
				if (currentTotal >= targetTotal) return false;
			}

			if (startedAtRef.current > 0) {
				const elapsed = Date.now() - startedAtRef.current;
				if (elapsed >= MAX_POLL_DURATION_MS) return false;
			}

			return POLL_INTERVAL_MS;
		},
	});

	const currentTotal = query.data?.total;
	const isSynced =
		targetTotal !== null &&
		currentTotal !== undefined &&
		currentTotal >= targetTotal;

	return {
		...query,
		isExpired: isExpired && !isSynced,
		isSynced,
	};
}
