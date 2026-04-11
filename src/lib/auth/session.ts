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
 */

import {
	authSessionSchema,
	type AuthSession,
	type AuthUser,
} from '@/types/auth';
import { cookies } from 'next/headers';
import { cache } from 'react';
import 'server-only';

import { clearSentryUser, setSentryUser } from '@/lib/sentry/user';

import { AUTH_COOKIES, COOKIE_OPTIONS } from './config';
import { decodeJwt, isJwtExpired, jwtPayloadToUser } from './jwt';
import { clearUserModeCookie } from '@/lib/mode/cookies';

/**
 * Sets authentication cookies after successful login
 *
 * Stores JWT token in httpOnly cookie (secure) and user data
 * in readable cookie (for client-side access if needed).
 *
 * @param token - JWT token from backend
 * @param user - User data to store in session cookie
 */
export async function setAuthCookies(
	token: string,
	user: AuthUser,
): Promise<void> {
	const cookieStore = await cookies();

	// Token cookie: httpOnly (default from COOKIE_OPTIONS) — never readable by JS
	cookieStore.set(AUTH_COOKIES.TOKEN, token, COOKIE_OPTIONS);
	// Session cookie: httpOnly: false so client can hydrate user state (name, avatar)
	// without a server round-trip. Contains no secrets — only display-safe user fields.
	cookieStore.set(AUTH_COOKIES.SESSION, JSON.stringify(user), {
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
 * Get current session from JWT token
 * Validates token expiration and decodes user data
 *
 * @returns AuthSession with user data and token, or null if invalid/expired
 */
export async function getSession(): Promise<AuthSession | null> {
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

		// Step 3: Decode JWT payload and build session object.
		const payload = decodeJwt(token);

		const session = {
			user: jwtPayloadToUser(payload),
			token,
			expiresAt: new Date(payload.exp * 1000).toISOString(),
		};

		// Step 4: Validate session shape with Zod to catch contract drift.
		const validated = authSessionSchema.parse(session);

		// Step 5: Attach the user ID to Sentry's isolation scope. Every
		// page, layout, and server action on a request path reads session
		// here — this is the single point that guarantees errors captured
		// anywhere downstream carry a user ID without touching ~90 service
		// action call sites. No PII is sent (see `setSentryUser`).
		setSentryUser(validated.user.id);

		return validated;
	} catch {
		// Malformed JWT or Zod validation failure — treat as unauthenticated
		// rather than crashing the page. User will be redirected to sign-in.
		clearSentryUser();
		return null;
	}
}

/**
 * Gets current authenticated user (cached per-request via React.cache).
 *
 * Prefer this over raw `getSession()` in server components — React.cache
 * deduplicates the cookie read + JWT decode across the same request.
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
