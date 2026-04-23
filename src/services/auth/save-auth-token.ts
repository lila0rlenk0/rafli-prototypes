'use server';

import { validateJwtStructure } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
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
		// Step 1: Guard — empty token means OAuth callback failed upstream
		if (!token) {
			return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
		}

		// Step 2: Structural validation — rejects unsigned, expired, or absurdly long-lived tokens.
		validateJwtStructure(token);

		// Step 3: Persist via GET /me — identity comes from the API, not client-decoded JWT
		await setAuthCookies(token);

		return success(undefined);
	} catch (error) {
		// Step 5: JWT decode or cookie-setting failure — critical auth path
		captureServiceError(error, AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED, {
			service: 'auth',
			action: 'save-auth-token',
		});
		return failure(AUTH_ERROR_CODES.SOCIAL_TOKEN_EXCHANGE_FAILED);
	}
}
