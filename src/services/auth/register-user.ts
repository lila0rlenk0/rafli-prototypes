'use server';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { signUpInputSchema, type SignUpInput } from '@/types/auth';
import {
	AUTH_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AuthErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Registers a new user account.
 * Returns void on success — user must sign in separately after registering.
 *
 * @param input - User registration data (email, password, name)
 * @returns ServiceResponse with void data on success, AuthErrorCode on failure
 */
export async function registerUser(
	input: SignUpInput,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	try {
		// Step 1: Validate input — reject malformed payloads before hitting the network
		const validationResult = signUpInputSchema.safeParse(input);
		if (!validationResult.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Create user account on backend (public endpoint, no auth required).
		// Captcha token travels in the `x-captcha-response` header — Better Auth's
		// captcha plugin reads it from the header (not body) before any auth
		// handler runs, so it must be stripped from the JSON payload.
		const { captchaToken, ...credentials } = validationResult.data;
		const response = await baseClient.post('/auth/sign-up/email', credentials, {
			headers: { 'x-captcha-response': captchaToken },
		});

		// Step 3: Guard — backend must return a user object on success
		if (!response.data.user) {
			return failure(AUTH_ERROR_CODES.SIGNUP_FAILED);
		}

		// Step 4: Non-blocking analytics — track successful registration after response
		await trackAfter(
			AUTH_EVENTS.SIGN_UP_COMPLETED,
			{
				method: 'email',
				user_id: response.data.user.id,
			},
			{ userId: response.data.user.id },
		);

		return success(undefined);
	} catch (error) {
		// Step 5: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'register-user',
		});

		// Non-blocking failure analytics
		await trackAfter(AUTH_EVENTS.SIGN_UP_FAILED, {
			method: 'email',
			error_code: errorCode,
		});

		return failure(errorCode);
	}
}
