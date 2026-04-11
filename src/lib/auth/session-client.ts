'use server';

import { cookies } from 'next/headers';

import { AUTH_COOKIES, COOKIE_OPTIONS } from './config';
import { decodeJwt, jwtPayloadToUser, validateJwtStructure } from './jwt';

/**
 * Server action to set auth cookies from JWT token
 *
 * Called from client-side OAuth callback after exchanging session for JWT.
 * Decodes JWT to extract user data and sets raffly auth cookies.
 *
 * @param token - JWT token from backend
 * @returns Success/failure result
 */
export async function setAuthCookiesClient(
	token: string,
): Promise<{ success: boolean }> {
	try {
		// Step 1: Structural validation — rejects unsigned, expired, or absurdly long-lived
		// tokens. Not signature verification (backend handles EdDSA/JWKS), but catches
		// trivially forged tokens before they reach httpOnly cookie storage.
		validateJwtStructure(token);

		// Step 2: Decode JWT to extract user data for session cookie hydration.
		const payload = decodeJwt(token);
		const user = jwtPayloadToUser(payload);

		// Step 3: Set auth cookies — token (httpOnly) + session (readable for client hydration).
		const cookieStore = await cookies();
		cookieStore.set(AUTH_COOKIES.TOKEN, token, COOKIE_OPTIONS);
		// httpOnly: false so client can hydrate user state without a server round-trip.
		// Exclude emailVerified and permissions — security-sensitive fields that
		// must only be read server-side. Minimizes PII exposure surface on XSS.
		const sessionUser = {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.image,
		};
		cookieStore.set(AUTH_COOKIES.SESSION, JSON.stringify(sessionUser), {
			...COOKIE_OPTIONS,
			httpOnly: false,
		});

		// Sentry user attribution is handled on the next request via
		// getSession() (server) and on the next client mount via
		// SentryUserSync (browser) — no manual tagging needed here.

		return { success: true };
	} catch (error) {
		console.error('Failed to set auth cookies:', error);
		return { success: false };
	}
}
