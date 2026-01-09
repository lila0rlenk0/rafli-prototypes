import type { AuthSession, AuthUser } from '@/types/auth';
import { cookies } from 'next/headers';
import { cache } from 'react';
import 'server-only';

import { AUTH_COOKIES, COOKIE_OPTIONS } from './config';
import { decodeJwt, isJwtExpired } from './jwt';

// Set authentication cookies
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

// Get authentication token
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

		return {
			user: {
				id: payload.sub || payload.id,
				email: payload.email,
				emailVerified: payload.emailVerified,
				name: payload.name,
				image: null, // JWT doesn't include image, fetch separately if needed
			},
			token,
			expiresAt: new Date(payload.exp * 1000).toISOString(),
		};
	} catch {
		return null;
	}
});

// Get current user (cached)
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
	const session = await getSession();
	return session?.user ?? null;
});

// Require authentication (throws if not authenticated)
export async function requireAuth(): Promise<AuthSession> {
	const session = await getSession();
	if (!session) {
		throw new Error('Unauthorized');
	}
	return session;
}

// Require email verification
export async function requireEmailVerification(): Promise<AuthSession> {
	const session = await requireAuth();
	if (!session.user.emailVerified) {
		throw new Error('Email not verified');
	}
	return session;
}
