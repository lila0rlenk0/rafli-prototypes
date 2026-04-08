'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { CreditBalanceResponse } from '@/types/credits';
import type { PaymentErrorCode } from '@/types/errors';

import { getCreditBalance } from './get-credit-balance';

/** Query key prefix — invalidate with ['credits'] to refresh all credit queries */
export function creditBalanceKey() {
	return ['credits', 'balance'] as const;
}

/**
 * Query hook for the current user's credit balance.
 *
 * Overrides the global `refetchOnWindowFocus: false` default because credit
 * balance is high-stakes — users see it before committing to a payment.
 * Refetching on focus catches cross-tab spends that would otherwise show
 * a stale balance and lead to a confusing `insufficient-balance` error.
 *
 * @param options.enabled - Whether to fetch (default true)
 * @returns React Query result with credit balance data
 */
export function useCreditBalance(options?: { enabled?: boolean }) {
	return useQuery<CreditBalanceResponse, ServiceError<PaymentErrorCode>>({
		queryKey: creditBalanceKey(),
		queryFn: async function fetchCreditBalance() {
			const result = await getCreditBalance();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: options?.enabled ?? true,
		// Exception to global "all auto-refetch disabled" rule — credit balance
		// is payment-critical and stale values cause failed checkout attempts.
		refetchOnWindowFocus: true,
	});
}
