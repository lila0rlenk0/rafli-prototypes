'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { SubscriptionErrorCode } from '@/types/errors';
import type { MySubscription } from '@/types/subscription';

import { getMySubscription } from './get-my-subscription';

/** Query key prefix — invalidate with `['subscription']` to refresh every related query. */
export function mySubscriptionKey() {
	return ['subscription', 'me'] as const;
}

interface UseMySubscriptionOptions {
	/** Gate the query for guests / sign-in-only surfaces — default `true`. */
	readonly enabled?: boolean;
}

/**
 * Query hook for the authenticated user's current subscription.
 *
 * Unlike `useCreditBalance`, this one sticks with the project-wide defaults
 * (`staleTime: Infinity`, `refetchOnWindowFocus: false`). The tier badge is
 * purely informational — it doesn't gate a payment, so a slightly stale value
 * is acceptable in exchange for one fewer focus-refetch per tab switch.
 *
 * @param options.enabled - Pass `false` to skip the query entirely (e.g. for unauthenticated viewers).
 * @returns React Query result. `data` is `null` when the user has no subscription.
 */
export function useMySubscription(options?: UseMySubscriptionOptions) {
	return useQuery<MySubscription | null, ServiceError<SubscriptionErrorCode>>({
		queryKey: mySubscriptionKey(),
		queryFn: async function fetchMySubscription() {
			const result = await getMySubscription();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: options?.enabled ?? true,
	});
}
