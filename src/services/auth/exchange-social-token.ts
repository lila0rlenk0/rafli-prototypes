'use server';

import { env } from '@/env/server';
import { decodeJwt } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { cookies } from 'next/headers';

type ExchangeTokenResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Exchanges better-auth session token for JWT token and sets raffly cookies
 *
 * This is called from the OAuth callback page after better-auth
 * sets the session cookies during the redirect.
 * Reads the better-auth.session_token, exchanges it for JWT via /api/auth/token,
 * then creates raffly cookies and deletes better-auth cookies.
 *
 * @returns ServiceResponse with void on success
 */
export async function exchangeSocialToken(): Promise<ExchangeTokenResponse> {
	try {
		const cookieStore = await cookies();

		// Get session_token from better-auth cookie
		const sessionToken = cookieStore.get('better-auth.session_token')?.value;

		if (!sessionToken) {
			return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
		}

		// Encode session_token before sending
		const encodedSessionToken = encodeURIComponent(sessionToken);

		// Exchange session_token for JWT token
		const response = await fetch(`${env.BACKEND_URL}/api/auth/token`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${encodedSessionToken}`,
			},
		});

		if (!response.ok) {
			return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
		}

		const data = await response.json();

		if (!data.token) {
			return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
		}

		// Decode JWT to extract user data
		const payload = decodeJwt(data.token);

		// Build user object from JWT payload
		const user = {
			id: payload.sub || payload.id,
			email: payload.email,
			name: payload.name,
			emailVerified: payload.emailVerified,
			image: null,
			permissions: payload.permissions,
		};

		// Set raffly auth cookies (same pattern as sign-in/sign-up)
		await setAuthCookies(data.token, user);

		// Delete better-auth cookies
		cookieStore.delete('better-auth.session_token');
		cookieStore.delete('better-auth.session_data');
		cookieStore.delete('better-auth.state');

		return success(undefined);
	} catch (error) {
		console.error('Token exchange failed:', error);
		return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
	}
}
