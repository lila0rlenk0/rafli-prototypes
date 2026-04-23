/**
 * Server-side Session Management
 *
 * Handles authentication state via secure HTTP-only cookies.
 * All functions are cached per-request using React's cache().
 *
 * SECURITY:
 * - JWT token stored in httpOnly cookie (not accessible via JS)
 * - User session data in readable cookie for client hydration
 * - Token validation checks expiration (signature verified by backend)
 * - `getSession` is wrapped in `cache()` so `getCurrentUser`, `requireAuth`,
 *   layouts, and guards share one auth resolution per request (one `/me`
 *   when the token is non-expired) instead of N duplicate round-trips.
 */

import {
	authSessionSchema,
	type AuthSession,
	type AuthUser,
} from '@/types/auth';
import { cookies } from 'next/headers';
import { cache } from 'react';
import 'server-only';

import {
	clearSentryUser,
	setSentryUser,
	setSentryUserMode,
} from '@/lib/sentry/user';

// `fetch-me-with-bearer` is imported inside `setAuthCookies` / `getSession`, not
// here. A static import binds `fetchMeWithBearerToken` at the first time
// `session` loads; under Bun, `mock.module('@/lib/auth/fetch-me-with-bearer')`
// in a later test file would not replace that binding, so integration tests
// (e.g. verify-bearer-cookies) would still see the preload stub. Dynamic
// import() resolves the module at call time, so the active mock always wins.
import { AUTH_COOKIES, COOKIE_OPTIONS } from './constants';
import { decodeJwt, isJwtExpired } from './jwt';
import { clearUserModeCookie, getUserModeCookie } from '@/lib/mode/cookies';

/**
 * Sets authentication cookies after successful login
 *
 * Stores JWT token in httpOnly cookie (secure) and user data
 * in readable cookie (for client-side access if needed).
 *
 * @param token - JWT token from backend (must be accepted by GET /me — never trust client-decoded claims alone; mitigates forged-JWT server actions)
 */
export async function setAuthCookies(token: string): Promise<void> {
	const { fetchMeWithBearerToken, meResponseToAuthUser } =
		await import('@/lib/auth/fetch-me-with-bearer');
	// Sign-in is authoritative: any non-`ok` outcome (unauthorized OR
	// transient) must block cookie writes — we never persist a token the
	// backend hasn't positively acknowledged.
	const outcome = await fetchMeWithBearerToken(token);
	if (outcome.kind !== 'ok') {
		throw new Error('Token rejected by backend');
	}
	const user = meResponseToAuthUser(outcome.me);

	const cookieStore = await cookies();

	// Token cookie: httpOnly (default from COOKIE_OPTIONS) — never readable by JS
	cookieStore.set(AUTH_COOKIES.TOKEN, token, COOKIE_OPTIONS);
	// Session cookie: httpOnly: false so client can hydrate user state (name, avatar)
	// without a server round-trip. Contains no secrets — only display-safe user fields.
	// Deliberately excludes `emailVerified` and `permissions` — these are security-sensitive
	// (permissions reveals admin/host status, emailVerified gates features) and must only
	// be read server-side via getSession(). Minimizes PII exposure surface on XSS.
	const sessionUser = {
		id: user.id,
		email: user.email,
		name: user.name,
		image: user.image ?? null,
	};
	cookieStore.set(AUTH_COOKIES.SESSION, JSON.stringify(sessionUser), {
		...COOKIE_OPTIONS,
		httpOnly: false,
	});
}

/**
 * Retrieves the JWT authentication token from cookies
 *
 * @returns JWT token string or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
	const cookieStore = await cookies();
	return cookieStore.get(AUTH_COOKIES.TOKEN)?.value ?? null;
}

/**
 * Get current session from JWT token.
 *
 * Validates token expiration and decodes user data. Also populates
 * Sentry's request-scoped isolation scope with the user ID and the
 * `userMode` tag so every downstream error captured in this request
 * carries correct attribution without touching ~90 service action
 * call sites. Anonymous requests clear the scope defensively.
 *
 * @returns AuthSession with user data and token, or null if invalid/expired
 */
export const getSession = cache(
	async function getSessionImpl(): Promise<AuthSession | null> {
		// Step 1: Retrieve JWT from httpOnly cookie.
		const token = await getAuthToken();
		if (!token) {
			// Anonymous request — clear any residual Sentry user on the current
			// isolation scope so an error captured later in this request isn't
			// attributed to a previous authenticated user by accident. Scopes are
			// request-isolated in Next.js via AsyncLocalStorage, but defending
			// against the edge case is cheaper than debugging it later.
			clearSentryUser();
			return null;
		}

		try {
			// Step 2: Check expiration — clear stale cookies to prevent repeated
			// decode-check-redirect cycles on every navigation.
			if (isJwtExpired(token)) {
				const cookieStore = await cookies();
				cookieStore.delete(AUTH_COOKIES.TOKEN);
				cookieStore.delete(AUTH_COOKIES.SESSION);
				await clearUserModeCookie();
				clearSentryUser();
				return null;
			}

			// Step 3: Require backend-issued identity — never trust unsigned JWT
			// claims for permissions/roles (IDOR on admin UI if decode-only).
			// Tri-state outcome lets us distinguish "token rejected" (evict
			// cookies) from "backend blip" (keep cookies, return null for this
			// request so the next one retries once the backend recovers).
			const { fetchMeWithBearerToken, meResponseToAuthUser } =
				await import('@/lib/auth/fetch-me-with-bearer');
			const outcome = await fetchMeWithBearerToken(token);
			if (outcome.kind === 'unauthorized') {
				const cookieStore = await cookies();
				cookieStore.delete(AUTH_COOKIES.TOKEN);
				cookieStore.delete(AUTH_COOKIES.SESSION);
				await clearUserModeCookie();
				clearSentryUser();
				return null;
			}
			if (outcome.kind === 'transient') {
				// Backend unreachable / 5xx / contract drift — degrade to
				// "unauthenticated for this request" but DO NOT evict cookies.
				// A refresh once the backend recovers restores the session with
				// no manual re-login required.
				clearSentryUser();
				return null;
			}

			const payload = decodeJwt(token);

			const session = {
				user: meResponseToAuthUser(outcome.me),
				token,
				expiresAt: new Date(payload.exp * 1000).toISOString(),
			};

			// Step 4: Validate session shape with Zod to catch contract drift.
			const validated = authSessionSchema.parse(session);

			// Step 5: Attach the user ID and userMode tag to Sentry's
			// isolation scope. Every page, layout, and server action on a
			// request path reads session here — this is the single point
			// that guarantees errors captured anywhere downstream carry
			// correct attribution without touching ~90 service action call
			// sites. No PII is sent (see `setSentryUser`); the `userMode`
			// tag enables slicing the issue list by participant vs host.
			setSentryUser(validated.user.id);
			setSentryUserMode(await getUserModeCookie());

			return validated;
		} catch {
			// Malformed JWT or Zod validation failure — treat as unauthenticated
			// rather than crashing the page. User will be redirected to sign-in.
			clearSentryUser();
			return null;
		}
	},
);

/**
 * Gets current authenticated user (cached per-request via React.cache).
 *
 * Prefer this over re-implementing session reads — it delegates to
 * `getSession` (itself per-request `cache()`-deduped) so the same
 * `AuthUser` is shared everywhere in one RSC pass.
 *
 * @returns AuthUser object or null if not authenticated
 */
export const getCurrentUser = cache(
	async function getCurrentUserImpl(): Promise<AuthUser | null> {
		const session = await getSession();
		return session?.user ?? null;
	},
);

/**
 * Requires authentication or throws error
 *
 * Use in server components/actions that require authenticated user.
 *
 * @returns AuthSession with user data
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<AuthSession> {
	const session = await getSession();
	if (!session) {
		throw new Error('Unauthorized');
	}
	return session;
}

/**
 * Requires email verification or throws error
 *
 * Use in server components/actions that require verified email.
 *
 * @returns AuthSession with verified user data
 * @throws Error if not authenticated or email not verified
 */
export async function requireEmailVerification(): Promise<AuthSession> {
	const session = await requireAuth();
	if (!session.user.emailVerified) {
		throw new Error('Email not verified');
	}
	return session;
}
