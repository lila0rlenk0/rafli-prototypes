'use server';

import { cookies } from 'next/headers';

import { AUTH_COOKIES, COOKIE_OPTIONS } from './config';
import { decodeJwt, jwtPayloadToUser } from './jwt';

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
		const payload = decodeJwt(token);
		const user = jwtPayloadToUser(payload);
		const cookieStore = await cookies();

		// Store token in httpOnly cookie
		cookieStore.set(AUTH_COOKIES.TOKEN, token, COOKIE_OPTIONS);

		// Store user data in separate cookie (can be read client-side if needed)
		cookieStore.set(AUTH_COOKIES.SESSION, JSON.stringify(user), {
			...COOKIE_OPTIONS,
			httpOnly: false,
		});

		return { success: true };
	} catch (error) {
		console.error('Failed to set auth cookies:', error);
		return { success: false };
	}
}
