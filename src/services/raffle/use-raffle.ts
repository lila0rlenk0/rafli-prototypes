'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { Raffle } from '@/types/raffle';

import { getRaffle } from './get-raffle';

export function raffleKey(publicSlug: string | null) {
	return ['raffle', 'detail', publicSlug] as const;
}

interface UseRaffleOptions {
	enabled?: boolean;
	authed?: boolean;
}

/**
 * React Query hook for a single raffle detail. Used after payment
 * verification to fetch the current pool count instead of trusting the
 * server-rendered page snapshot from before Stripe polling completed.
 *
 * @returns React Query result with the latest raffle detail
 */
export function useRaffle(
	publicSlug: string | null,
	options?: UseRaffleOptions,
) {
	return useQuery<Raffle, ServiceError<RaffleErrorCode>>({
		queryKey: raffleKey(publicSlug),
		queryFn: async function fetchRaffle() {
			if (publicSlug === null) {
				throw serviceError(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			const result = await getRaffle(publicSlug, { authed: options?.authed });
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: publicSlug !== null && (options?.enabled ?? true),
	});
}
