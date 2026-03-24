'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { VerificationErrorCode } from '@/types/errors/verification-errors';
import type { WinnerVerification } from '@/types/verification';

import { verifyWinner } from './verify-winner';

/** Query key for winner verification — exported for cache invalidation */
export function winnerVerificationKey(raffleId: string, position: number) {
	return ['verification', 'winner', raffleId, position] as const;
}

/**
 * Fetches and caches winner verification data for a specific position.
 *
 * Verification data is immutable once a raffle concludes,
 * so a long stale time (30 min) avoids redundant requests.
 *
 * @returns React Query result with winner verification data
 */
export function useWinnerVerification(raffleId: string, position: number) {
	return useQuery<WinnerVerification, ServiceError<VerificationErrorCode>>({
		queryKey: winnerVerificationKey(raffleId, position),
		queryFn: async function fetchWinnerVerification() {
			const result = await verifyWinner(raffleId, position);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		// Verification data is immutable — long stale time
		staleTime: 30 * 60 * 1_000,
	});
}
