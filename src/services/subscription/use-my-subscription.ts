'use client';

import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { SubscriptionErrorCode } from '@/types/errors';
import type { MySubscription } from '@/types/subscription';

import { getMySubscription } from './get-my-subscription';

/** Query key prefix — invalidate with `['subscription']` to refresh every related query. */
function mySubscriptionKey() {
	return ['subscription', 'me'] as const;
}

/**
 * Invalidates every cached read of the user's subscription state.
 *
 * Call this after any flow that mutates subscription server-side
 * (subscribe success, cancel, plan change, billing portal exit). Without this,
 * `useMySubscription`'s `staleTime: Infinity` policy keeps the old payload —
 * showing a stale tier badge / an outdated subscriber-discount preview until
 * the user manually refreshes.
 *
 * Pairs with the page-level `getRaffleSubscriptionContext` server fetch on raffle
 * pages — this hook is React-Query-only; the RSC fetch is fresh per request.
 *
 * @returns Stable callback that, when invoked, marks subscription queries stale
 *          so the next consumer triggers a refetch.
 */
export function useInvalidateMySubscription(): () => Promise<void> {
	const queryClient = useQueryClient();
	return useCallback(
		async function invalidateMySubscription(): Promise<void> {
			await queryClient.invalidateQueries({ queryKey: mySubscriptionKey() });
		},
		[queryClient],
	);
}

/**
 * Query hook for the authenticated user's current subscription.
 *
 * Unlike `useCreditBalance`, this one sticks with the project-wide defaults
 * (`staleTime: Infinity`, `refetchOnWindowFocus: false`). The tier badge is
 * purely informational — it doesn't gate a payment, so a slightly stale value
 * is acceptable in exchange for one fewer focus-refetch per tab switch.
 *
 * @returns React Query result. `data` is `null` when the user has no subscription.
 */
export function useMySubscription() {
	return useQuery<MySubscription | null, ServiceError<SubscriptionErrorCode>>({
		queryKey: mySubscriptionKey(),
		queryFn: async function fetchMySubscription() {
			const result = await getMySubscription();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
	});
}
