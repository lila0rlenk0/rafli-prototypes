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
 * Keyed on the captcha token so a fresh challenge produces a fresh React
 * Query entry — solving a new Turnstile challenge after a failed mint
 * cannot be served from the prior token's cache. The token itself is not
 * sensitive (single-use, ~5 min lifespan, validated server-side) so
 * surfacing it as a query key avoids needing a separate `enabled` toggle
 * cascade between widget state and React Query.
 */
export function fanbasisPublicCreditSessionKey(
	captchaToken: string | null,
) {
	return ['fanbasis-public-credit', 'session', captchaToken] as const;
}

export function fanbasisPublicCreditSessionQueryOptions(
	captchaToken: string | null,
) {
	return {
		queryKey: fanbasisPublicCreditSessionKey(captchaToken),
		queryFn: async function mintFanbasisSession() {
			// `enabled` below guards against null tokens, but TypeScript narrows
			// only inside the conditional — assert here so the body stays typed
			// without an `enabled`-induced type cast.
			if (!captchaToken) throw serviceError('validation_error');
			const result = await createFanbasisPublicCreditCheckout({
				captchaToken,
			});
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
		// Only fire once Turnstile has issued a token. Prevents the mint from
		// running on first paint with no captcha proof — backend would reject
		// (audit H1) and burn a session-mint slot for nothing.
		enabled: captchaToken !== null,
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
 * Captcha gating: the consumer renders a `TurnstileWidget` upstream and
 * passes the issued token into this hook. While the token is null, the
 * `enabled` flag keeps the query idle so the Fanbasis broker never sees
 * a tokenless request — the backend would reject it anyway (audit H1)
 * but skipping the round-trip avoids burning the upstream rate-limit.
 *
 * The `gcTime` window keeps the same minted session reusable for short
 * navigation hops within the tab — bouncing to another route and back
 * does not re-mint, sparing the backend broker (and Fanbasis) from a
 * fresh per-IP hit on every `/subscribe` mount. `staleTime: Infinity`
 * plus `refetchOnWindowFocus: false` and `refetchOnReconnect: false`
 * prevent surprise refreshes that would re-init the iframe and discard
 * partially entered payment details. When a fresh mint is genuinely
 * needed (failed attempt, expired session), the consumer resets the
 * captcha widget which keys a new query entry.
 *
 * @param captchaToken - Cloudflare Turnstile token (null = idle)
 * @returns React Query result with the embed config or a typed Fanbasis error
 */
export function useFanbasisPublicCreditSession(captchaToken: string | null) {
	return useQuery<
		FanbasisPublicCreditCheckoutResponse,
		ServiceError<FanbasisPublicCreditErrorCode>
	>(fanbasisPublicCreditSessionQueryOptions(captchaToken));
}
