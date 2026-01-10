'use server';

import { baseClient } from '@/lib/api/client';
import { setAuthCookies } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors';
import type { SignInInput } from '@/types/auth';
import {
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for sign-in operation
 * Returns void on success (session is set in cookies)
 */
type SignInResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Authenticates a user with email and password
 * Sets authentication cookies on successful sign-in
 *
 * @param input - User credentials (email and password)
 * @returns ServiceResponse with void data on success, AuthErrorCode on failure
 */
export async function signInUser(input: SignInInput): Promise<SignInResponse> {
	try {
		const response = await baseClient.post('/api/auth/sign-in/email', input);

		const { token, user } = response.data;

		// Validate server response structure
		if (!token || !user) {
			return failure(COMMON_ERROR_CODES.UNKNOWN_ERROR);
		}

		// Set authentication cookies
		await setAuthCookies(token, user);

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);
		return failure(errorCode);
	}
}
