'use server';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { signUpInputSchema, type SignUpInput } from '@/types/auth';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
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
		// Validate input payload
		const validationResult = signUpInputSchema.safeParse(input);
		if (!validationResult.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		const response = await baseClient.post(
			'/auth/sign-up/email',
			validationResult.data,
		);

		// Validate successful registration
		if (!response.data.user) {
			return failure(AUTH_ERROR_CODES.SIGNUP_FAILED);
		}

		// Track successful sign-up (awaited to ensure completion in serverless)
		await trackServer(
			AUTH_EVENTS.SIGN_UP_COMPLETED,
			{ method: 'email' },
			{ userId: response.data.user.id },
		);

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);

		// Track failed sign-up (awaited to ensure completion in serverless)
		await trackServer(AUTH_EVENTS.SIGN_UP_FAILED, {
			method: 'email',
			error_code: errorCode,
		});

		return failure(errorCode);
	}
}
