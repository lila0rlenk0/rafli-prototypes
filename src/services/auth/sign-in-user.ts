'use server';

import { AUTH_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { setAuthCookies } from '@/lib/auth/session';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { setSentryUser } from '@/lib/sentry/user';
import { signInInputSchema, type SignInInput } from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Authenticates a user with email and password.
 * Sets authentication cookies on successful sign-in.
 *
 * @param input - User credentials (email and password)
 * @returns ServiceResponse with void on success, AuthErrorCode on failure
 */
export async function signInUser(
	input: SignInInput,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	try {
		// Step 1: Validate input — reject malformed credentials before network call
		const validationResult = signInInputSchema.safeParse(input);
		if (!validationResult.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Authenticate against backend (public endpoint).
		// Captcha token travels in the `x-captcha-response` header — Better Auth's
		// captcha plugin reads it from the header (not body) before any auth
		// handler runs, so it must be stripped from the JSON payload.
		const { captchaToken, ...credentials } = validationResult.data;
		const response = await baseClient.post('/auth/sign-in/email', credentials, {
			headers: { 'x-captcha-response': captchaToken },
		});

		const { token, user } = response.data;

		// Step 3: Guard — backend must return both token and user on success
		if (!token || !user) {
			return failure(COMMON_ERROR_CODES.UNKNOWN_ERROR);
		}

		// Step 4: Persist auth state into cookies
		// Side-effects: sets raffly-token (httpOnly) and raffly-session cookies
		await setAuthCookies(token);

		// Step 5: Tag Sentry scope so subsequent errors are attributed to this user
		setSentryUser(user.id);

		// Step 6: Non-blocking success analytics
		await trackAfter(
			AUTH_EVENTS.SIGN_IN_COMPLETED,
			{ method: 'email' },
			{ userId: user.id },
		);

		return success(undefined);
	} catch (error) {
		// Step 7: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'sign-in-user',
		});

		// Non-blocking failure analytics
		await trackAfter(AUTH_EVENTS.SIGN_IN_FAILED, {
			method: 'email',
			error_code: errorCode,
		});

		return failure(errorCode);
	}
}
