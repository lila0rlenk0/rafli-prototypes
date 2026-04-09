'use server';

import { runAfter } from '@/lib/run-after';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { setAuthCookies } from '@/lib/auth/session';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { setSentryUser } from '@/lib/sentry/user';
import { signInInputSchema, type SignInInput } from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
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
		// Validate input payload
		const validationResult = signInInputSchema.safeParse(input);
		if (!validationResult.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Fire-and-forget: track intent before API call — captures drop-off between
		// form submit and completion. Not awaited so it doesn't block the response.
		void trackServer(AUTH_EVENTS.SIGN_IN_STARTED, { method: 'email' });

		const response = await baseClient.post(
			'/auth/sign-in/email',
			validationResult.data,
		);

		const { token, user } = response.data;

		// Validate server response structure
		if (!token || !user) {
			return failure(COMMON_ERROR_CODES.UNKNOWN_ERROR);
		}

		// Set authentication cookies
		await setAuthCookies(token, user);

		// Tag all subsequent Sentry errors with this user ID
		setSentryUser(user.id);

		runAfter(async () => {
			await trackServer(
				AUTH_EVENTS.SIGN_IN_COMPLETED,
				{ method: 'email' },
				{ userId: user.id },
			);
		});

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'sign-in-user',
		});

		runAfter(async () => {
			await trackServer(AUTH_EVENTS.SIGN_IN_FAILED, {
				method: 'email',
				error_code: errorCode,
			});
		});

		return failure(errorCode);
	}
}
