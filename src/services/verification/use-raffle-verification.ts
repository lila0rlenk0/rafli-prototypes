'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { RaffleVerificationPayload } from '@/types/verification';

import { getRaffleVerification } from './get-raffle-verification';

/** Query key for raffle verification — exported for cache invalidation */
export function raffleVerificationKey(raffleId: string) {
	return ['verification', 'raffle', raffleId] as const;
}

/**
 * Fetches and caches raffle verification data.
 *
 * Verification data is immutable once a raffle concludes,
 * so a long stale time (30 min) avoids redundant requests.
 *
 * @returns React Query result with raffle verification data
 */
export function useRaffleVerification(raffleId: string) {
	return useQuery<
		RaffleVerificationPayload,
		ServiceError<VerificationErrorCode>
	>({
		queryKey: raffleVerificationKey(raffleId),
		queryFn: async function fetchRaffleVerification() {
			const result = await getRaffleVerification(raffleId);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		// Verification data is immutable — long stale time
		staleTime: 30 * 60 * 1_000,
	});
}
