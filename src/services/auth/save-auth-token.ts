'use server';

import { decodeJwt, jwtPayloadToUser } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

type SaveAuthTokenResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Saves JWT token to frontend cookies
 *
 * This is called from the OAuth callback after getting the JWT token
 * from the backend. The JWT payload contains user data which is extracted
 * and stored in cookies.
 *
 * @param token - JWT token from backend
 * @returns ServiceResponse with void on success
 */
export async function saveAuthToken(
	token: string,
): Promise<SaveAuthTokenResponse> {
	try {
		if (!token) {
			return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
		}

		// Decode JWT and extract user data
		const payload = decodeJwt(token);
		const user = jwtPayloadToUser(payload);

		// Set raffly auth cookies on frontend domain
		await setAuthCookies(token, user);

		return success(undefined);
	} catch (error) {
		console.error('Failed to save auth token:', error);
		return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
	}
}
