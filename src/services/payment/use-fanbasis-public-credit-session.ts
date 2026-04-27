'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { FanbasisPublicCreditErrorCode } from '@/types/errors';

import {
	createFanbasisPublicCreditCheckout,
	type FanbasisPublicCreditCheckoutResponse,
} from './create-fanbasis-public-credit-checkout';

/**
 * Query key for the Fanbasis public-credit session-mint call.
 *
 * Singleton key (no params) because the action takes no payload —
 * exactly one minted session per page load. Lives in a function so
 * future cache-invalidation calls can reach for the same constant
 * without a string-typo class of bug.
 */
export function fanbasisPublicCreditSessionKey() {
	return ['fanbasis-public-credit', 'session'] as const;
}

export function fanbasisPublicCreditSessionQueryOptions() {
	return {
		queryKey: fanbasisPublicCreditSessionKey(),
		queryFn: async function mintFanbasisSession() {
			const result = await createFanbasisPublicCreditCheckout();
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		// Fanbasis session secrets are single-use-ish checkout credentials.
		// Do not let a route revisit reuse an old secret from React Query cache.
		gcTime: 0,
		refetchOnMount: 'always' as const,
		// Within one mounted card, avoid surprise refreshes that would re-init
		// the iframe and discard partially entered payment details.
		staleTime: Infinity,
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	};
}

/**
 * Mints a Fanbasis embedded-checkout session via the backend broker.
 *
 * Conceptually a mutation (creates a Fanbasis session as a server-side
 * side effect), wrapped as `useQuery` because the surface we need is
 * "fetch once on mount, expose loading / error / data, allow retry"
 * — the `useMutation` shape (`mutate()` + manual lifecycle wiring)
 * would force a `useEffect` that triggers state cascades and trips
 * `react-hooks/set-state-in-effect`. `useQuery` runs the mint in its
 * own scheduling primitive, no effect needed in the consumer.
 *
 * `staleTime: Infinity` + `retry: false` keep the call exactly
 * one-shot: React Query does not auto-refetch on focus, reconnect, or
 * background revalidation. The user gets a single session per page
 * load; they explicitly opt in to a fresh mint via `refetch()` if the
 * first attempt failed.
 *
 * @returns React Query result with the embed config or a typed Fanbasis error
 */
export function useFanbasisPublicCreditSession() {
	return useQuery<
		FanbasisPublicCreditCheckoutResponse,
		ServiceError<FanbasisPublicCreditErrorCode>
	>(fanbasisPublicCreditSessionQueryOptions());
}
