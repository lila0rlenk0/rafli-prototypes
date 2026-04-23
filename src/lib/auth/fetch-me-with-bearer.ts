import 'server-only';

import { AxiosError } from 'axios';

import type { AuthUser } from '@/types/auth';
import { meResponseSchema, type MeResponse } from '@/types/user';

/**
 * Maps GET /me (only succeeds when the backend accepts the JWT signature) into AuthUser.
 * Use this for permissions and identity — never derive admin gates from decodeJwt alone.
 */
export function meResponseToAuthUser(me: MeResponse): AuthUser {
	return {
		id: me.id,
		email: me.email,
		emailVerified: me.emailVerified,
		name: me.name,
		image: me.image ?? undefined,
		permissions: me.permissions,
	};
}

/**
 * Tri-state outcome so callers can distinguish "token rejected" from
 * "backend unreachable / 5xx / contract drift". Collapsing both into `null`
 * (the prior shape) caused a backend blip to evict the user's cookies on
 * the next `getSession` — a refresh during a 30-second outage logged the
 * user out for real. `transient` preserves cookies so the next request
 * reconciles automatically once the backend recovers.
 */
export type FetchMeOutcome =
	| { kind: 'ok'; me: MeResponse }
	| { kind: 'unauthorized' }
	| { kind: 'transient' };

/**
 * Confirms the bearer token is valid on the API by round-tripping GET /me.
 * Intentionally **not** wrapped in `react.cache` — `getSession` is
 * `cache()`-deduped per request, so multiple callers share one `fetchMe`
 * outcome; wrapping this function would add a second memoization layer and
 * `cache` on the fetch layer was poisoning Bun tests (same token + stable
 * mock order memoized a rejected `/me` across later tests in the process).
 *
 * Mitigates forged-JWT server actions: unsigned tokens never receive a 200 from /me.
 * Only a real `401` from the backend is treated as "token rejected" — every
 * other failure (network, 5xx, timeout, schema drift) is `transient` so the
 * caller can avoid destructive cleanup (see `getSession` in session.ts).
 */
export async function fetchMeWithBearerToken(
	token: string,
): Promise<FetchMeOutcome> {
	try {
		// Dynamic import — in Bun, tests replace `@/lib/api/client`; a static
		// `baseClient` binding would be frozen to the pre-mock instance.
		const { baseClient } = await import('@/lib/api/client');
		const response = await baseClient.get('/me', {
			headers: { Authorization: `Bearer ${token}` },
		});
		// ZodError here is contract drift (backend returned 200 with an
		// unexpected body), not a token problem — bubble to the outer catch
		// which classifies it as `transient` so we don't evict valid cookies.
		return { kind: 'ok', me: meResponseSchema.parse(response.data) };
	} catch (error) {
		// Only a real backend `401` means the token is rejected. Anything
		// else (network error, 5xx, timeout, schema drift) keeps the user
		// logged in so a momentary backend hiccup is not a forced logout.
		if (error instanceof AxiosError && error.response?.status === 401) {
			return { kind: 'unauthorized' };
		}
		return { kind: 'transient' };
	}
}
