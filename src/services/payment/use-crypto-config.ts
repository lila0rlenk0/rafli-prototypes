'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { CryptoConfig } from '@/types/crypto-config';
import type { PaymentErrorCode } from '@/types/errors';

import { getCryptoConfig } from './get-crypto-config';

/** Query key for crypto config — exported for cache invalidation */
export function cryptoConfigKey() {
	return ['payment', 'crypto-config'] as const;
}

/**
 * Fetches and caches the global crypto payment configuration.
 *
 * Stale time is 10 minutes — chain metadata rarely changes.
 * Multiple components can call this hook without duplicating requests.
 *
 * @returns React Query result with crypto config
 */
export function useCryptoConfig() {
	return useQuery<CryptoConfig, ServiceError<PaymentErrorCode>>({
		queryKey: cryptoConfigKey(),
		queryFn: async function fetchCryptoConfig() {
			const result = await getCryptoConfig();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		staleTime: 10 * 60 * 1_000,
	});
}
