'use client';

import {
	useQueryClient,
	useQuery,
	type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { SubscriptionErrorCode } from '@/types/errors';
import type { MySubscriptionResponse } from '@/types/subscription';

import { getMySubscription } from './get-my-subscription';

// Only `refetchInterval` is exposed today — the post-Stripe-checkout dialog
// polls until the webhook lands. Widen this Pick if other consumers need
// further knobs; the cap exists so callers can't override the queryKey/queryFn
// and split the cache.
type MySubscriptionOptions = Pick<
	UseQueryOptions<MySubscriptionResponse, ServiceError<SubscriptionErrorCode>>,
	'refetchInterval'
>;

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
 * Query hook for the authenticated user's current subscription envelope.
 *
 * Unlike `useCreditBalance`, this one sticks with the project-wide defaults
 * (`staleTime: Infinity`, `refetchOnWindowFocus: false`). The tier badge is
 * purely informational — it doesn't gate a payment, so a slightly stale value
 * is acceptable in exchange for one fewer focus-refetch per tab switch.
 *
 * Cache shape mirrors the server action: `MySubscriptionResponse` —
 * `{ subscription, capabilities, lockedProvider }` — never `null` at the
 * envelope level (the wrapper is always populated; only `data.subscription`
 * can be `null` when the user has no active subscription). React Query layers
 * an `undefined` over the cache shape while the query is in flight, so
 * consumers should read `data?.subscription`, `data?.capabilities`, and
 * `data?.lockedProvider` to handle both states.
 *
 * @returns React Query result. `data.subscription` is `null` when the user
 *   has no subscription; `data.capabilities` is non-null whenever the user
 *   has subscription history (used to gate self-serve management UI).
 */
export function useMySubscription(options?: MySubscriptionOptions) {
	return useQuery<MySubscriptionResponse, ServiceError<SubscriptionErrorCode>>({
		queryKey: mySubscriptionKey(),
		queryFn: async function fetchMySubscription() {
			const result = await getMySubscription();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		refetchInterval: options?.refetchInterval,
	});
}
