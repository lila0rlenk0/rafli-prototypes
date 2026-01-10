'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors';
import type { SignUpInput } from '@/types/auth';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for registration
 * Returns void on success (user must sign in separately)
 */
type RegisterResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Registers a new user account
 *
 * @param input - User registration data (email, password, name)
 * @returns ServiceResponse with void data on success, AuthErrorCode on failure
 */
export async function registerUser(
	input: SignUpInput,
): Promise<RegisterResponse> {
	try {
		const response = await baseClient.post('/api/auth/sign-up/email', input);

		// Validate successful registration
		if (!response.data.user) {
			return failure(AUTH_ERROR_CODES.SIGNUP_FAILED);
		}

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);
		return failure(errorCode);
	}
}
