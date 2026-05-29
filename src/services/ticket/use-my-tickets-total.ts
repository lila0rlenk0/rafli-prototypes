'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import { TICKET_ERROR_CODES, type TicketErrorCode } from '@/types/errors';

import { getMyTicketCodes } from './get-my-ticket-codes';

/**
 * Query key for the current user's ticket total in a single raffle.
 *
 * @returns Stable query-key tuple
 */
export function myTicketsTotalKey(raffleId: string | null) {
	return ['ticket', 'my-total', raffleId] as const;
}

interface UseMyTicketsTotalOptions {
	enabled?: boolean;
}

/**
 * React Query hook returning the current user's authoritative ticket count
 * for one raffle. Used by the Stripe-return celebration so the "Your
 * Entries" figure reflects the just-completed purchase without depending
 * on stale server-rendered props.
 *
 * @returns React Query result wrapping the total entry count
 */
export function useMyTicketsTotal(
	raffleId: string | null,
	options?: UseMyTicketsTotalOptions,
) {
	return useQuery<number, ServiceError<TicketErrorCode>>({
		queryKey: myTicketsTotalKey(raffleId),
		queryFn: async function fetchMyTicketsTotal() {
			// Unreachable when `enabled` is wired correctly; throws so the
			// hook surfaces a typed error rather than `undefined`.
			if (raffleId === null) {
				throw serviceError(TICKET_ERROR_CODES.FETCH_FAILED);
			}
			const result = await getMyTicketCodes({ raffleId });
			if (!result.success) throw serviceError(result.error);
			return result.data.total;
		},
		enabled: raffleId !== null && (options?.enabled ?? true),
	});
}
