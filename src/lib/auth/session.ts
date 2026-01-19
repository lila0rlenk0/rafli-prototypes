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

import { authSessionSchema, type AuthSession, type AuthUser } from '@/types/auth';
import { cookies } from 'next/headers';
import { cache } from 'react';
import 'server-only';

import { AUTH_COOKIES, COOKIE_OPTIONS } from './config';
import { decodeJwt, isJwtExpired, jwtPayloadToUser } from './jwt';

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

	// Store token in httpOnly cookie
	cookieStore.set(AUTH_COOKIES.TOKEN, token, COOKIE_OPTIONS);

	// Store user data in separate cookie (can be read client-side if needed)
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
export const getSession = cache(async (): Promise<AuthSession | null> => {
	const token = await getAuthToken();
	if (!token) return null;

	try {
		// Check if token is expired
		if (isJwtExpired(token)) {
			return null;
		}

		// Decode JWT to extract user data
		const payload = decodeJwt(token);

		const session = {
			user: jwtPayloadToUser(payload),
			token,
			expiresAt: new Date(payload.exp * 1000).toISOString(),
		};

		// Validate session structure
		return authSessionSchema.parse(session);
	} catch {
		return null;
	}
});

/**
 * Gets current authenticated user (cached per-request)
 *
 * @returns AuthUser object or null if not authenticated
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
	const session = await getSession();
	return session?.user ?? null;
});

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
