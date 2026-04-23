'use server';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import {
	resetPasswordInputSchema,
	type ResetPasswordInput,
} from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Resets user password using token from email.
 * Fails with token-invalid error if the token has expired.
 *
 * @param input - Reset token and new password
 * @returns ServiceResponse with void on success, AuthErrorCode on failure
 */
export async function resetPassword(
	input: ResetPasswordInput,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	try {
		// Step 1: Re-parse input — server actions are public POST endpoints so
		// callers can append arbitrary fields (e.g. `email`, `userId`). Zod
		// strips unknowns, enforces the 12-char policy, and rejects empty
		// tokens before any network call.
		const validated = resetPasswordInputSchema.safeParse(input);
		if (!validated.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Submit new password with reset token
		await baseClient.post('/auth/reset-password', validated.data);

		// Step 3: Fire-and-forget analytics — no userId available (token-based flow)
		void trackServer(ACCOUNT_EVENTS.PASSWORD_RESET_COMPLETED, {});

		return success(undefined);
	} catch (error) {
		// Step 4: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'reset-password',
		});
		return failure(errorCode);
	}
}
