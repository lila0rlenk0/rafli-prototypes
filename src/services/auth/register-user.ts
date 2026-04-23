'use server';

import { runAfter } from '@/lib/utils/run-after';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
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

		// Step 2: Fire-and-forget intent tracking — captures drop-off between
		// form submit and completion. Not awaited so it doesn't block the response.
		void trackServer(AUTH_EVENTS.SIGN_UP_STARTED, { method: 'email' });

		// Step 3: Create user account on backend (public endpoint, no auth required)
		const response = await baseClient.post(
			'/auth/sign-up/email',
			validationResult.data,
		);

		// Step 4: Guard — backend must return a user object on success
		if (!response.data.user) {
			return failure(AUTH_ERROR_CODES.SIGNUP_FAILED);
		}

		// Step 5: Non-blocking analytics — track successful registration after response
		runAfter(async () => {
			await trackServer(
				AUTH_EVENTS.SIGN_UP_COMPLETED,
				{
					method: 'email',
					user_id: response.data.user.id,
				},
				{ userId: response.data.user.id },
			);
		});

		return success(undefined);
	} catch (error) {
		// Step 6: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'register-user',
		});

		// Non-blocking failure analytics
		runAfter(async () => {
			await trackServer(AUTH_EVENTS.SIGN_UP_FAILED, {
				method: 'email',
				error_code: errorCode,
			});
		});

		return failure(errorCode);
	}
}
