import type { AuthSession, AuthUser } from '@/types/auth';
import { cookies } from 'next/headers';
import { cache } from 'react';
import 'server-only';

const SESSION_COOKIE_NAME = 'raffly-session';
const TOKEN_COOKIE_NAME = 'raffly-token';

// Cookie options
const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 7, // 7 days
	path: '/',
};

// Set authentication cookies
export async function setAuthCookies(
	token: string,
	user: AuthUser,
): Promise<void> {
	const cookieStore = await cookies();

	// Store token in httpOnly cookie
	cookieStore.set(TOKEN_COOKIE_NAME, token, COOKIE_OPTIONS);

	// Store user data in separate cookie (can be read client-side if needed)
	cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
		...COOKIE_OPTIONS,
		httpOnly: false,
	});
}

// Get authentication token
export async function getAuthToken(): Promise<string | null> {
	const cookieStore = await cookies();
	return cookieStore.get(TOKEN_COOKIE_NAME)?.value ?? null;
}

// Get current session
export const getSession = cache(async (): Promise<AuthSession | null> => {
	const token = await getAuthToken();
	if (!token) return null;

	try {
		// Validate session with backend
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/get-session`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
				cache: 'no-store',
			},
		);

		if (!response.ok) {
			await clearAuthCookies();
			return null;
		}

		const data = await response.json();

		return {
			user: {
				id: data.user.id,
				email: data.user.email,
				emailVerified: data.user.emailVerified,
				name: data.user.name,
				image: data.user.image,
			},
			token,
			expiresAt: data.session.expiresAt,
		};
	} catch {
		await clearAuthCookies();
		return null;
	}
});

// Get current user (cached)
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
	const session = await getSession();
	return session?.user ?? null;
});

// Clear authentication cookies
export async function clearAuthCookies(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(TOKEN_COOKIE_NAME);
	cookieStore.delete(SESSION_COOKIE_NAME);
}

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
