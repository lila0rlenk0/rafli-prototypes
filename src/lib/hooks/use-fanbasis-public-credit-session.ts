'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { FanbasisPublicCreditErrorCode } from '@/types/errors';

import {
	createFanbasisPublicCreditCheckout,
	type FanbasisPublicCreditCheckoutResponse,
} from '@/services/payment/create-fanbasis-public-credit-checkout';

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
		// 5 minutes — within one tab session, reuse the minted Fanbasis session
		// if the user navigates away and back. Beyond that, mint fresh.
		gcTime: 5 * 60 * 1000,
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
 * The `gcTime` window keeps the same minted session reusable for short
 * navigation hops within the tab — bouncing to another route and back
 * does not re-mint, sparing the backend broker (and Fanbasis) from a
 * fresh per-IP hit on every `/subscribe` mount. `staleTime: Infinity`
 * plus `refetchOnWindowFocus: false` and `refetchOnReconnect: false`
 * prevent surprise refreshes that would re-init the iframe and discard
 * partially entered payment details. When a fresh mint is genuinely
 * needed (failed attempt, expired session), the consumer calls
 * `refetch()` explicitly.
 *
 * @returns React Query result with the embed config or a typed Fanbasis error
 */
export function useFanbasisPublicCreditSession() {
	return useQuery<
		FanbasisPublicCreditCheckoutResponse,
		ServiceError<FanbasisPublicCreditErrorCode>
	>(fanbasisPublicCreditSessionQueryOptions());
}
