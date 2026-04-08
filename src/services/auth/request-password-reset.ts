'use server';

import { ACCOUNT_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import type { RequestPasswordResetInput } from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for password reset request
 * Always returns success to prevent user enumeration
 */
type RequestPasswordResetResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Requests a password reset email
 * Always returns success to prevent user enumeration attacks
 *
 * @param input - Email and optional redirect URL
 * @returns ServiceResponse with void data on success
 */
export async function requestPasswordReset(
	input: RequestPasswordResetInput,
): Promise<RequestPasswordResetResponse> {
	try {
		await baseClient.post('/auth/forget-password', input);

		// Fire-and-forget — no userId available (unauthenticated flow)
		void trackServer(ACCOUNT_EVENTS.PASSWORD_RESET_REQUESTED, {});

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);

		// Capture all errors — the Sentry filter drops expected business codes.
		// Infrastructure errors (5XX, network) pass through for alerting.
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'request-password-reset',
		});

		// For infrastructure errors, return failure (user should know)
		// For user-related errors (not found), return success to prevent enumeration
		if (
			errorCode === COMMON_ERROR_CODES.NETWORK_ERROR ||
			errorCode === COMMON_ERROR_CODES.TIMEOUT_ERROR ||
			errorCode === COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR ||
			errorCode === COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED
		) {
			return failure(errorCode);
		}

		// Return success for all other cases to prevent enumeration
		return success(undefined);
	}
}
