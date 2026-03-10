'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { WalletErrorCode } from '@/types/errors';
import type { WalletsListResponse } from '@/types/wallet';

import { getWallets } from './get-wallets';

/** Query key for user's linked wallets */
export function walletsKey() {
	return ['wallets', 'list'] as const;
}

/**
 * Query hook for fetching user's linked wallets
 * Used in crypto checkout to check if wallet is already verified
 *
 * @param options - Query options
 * @returns React Query result with wallets list
 */
export function useWallets(options?: { enabled?: boolean }) {
	return useQuery<WalletsListResponse, ServiceError<WalletErrorCode>>({
		queryKey: walletsKey(),
		queryFn: async function fetchWallets() {
			const result = await getWallets();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: options?.enabled ?? true,
	});
}
