'use server';

import { baseClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for resend verification email.
 * Always returns success to prevent user enumeration — mirrors backend behavior.
 */
type ResendVerificationEmailResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Requests a new verification email for the given address.
 * Backend always returns 200 regardless of account existence (enumeration-safe).
 *
 * Only infrastructure errors (network, timeout, rate limit) surface as failures
 * so the user knows to retry — all other errors silently succeed to prevent
 * leaking whether an account exists.
 */
export async function resendVerificationEmail(
	email: string,
): Promise<ResendVerificationEmailResponse> {
	try {
		await baseClient.post('/auth/send-verification-email', { email });

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);

		// Infrastructure errors — user should know to retry
		if (
			errorCode === COMMON_ERROR_CODES.NETWORK_ERROR ||
			errorCode === COMMON_ERROR_CODES.TIMEOUT_ERROR ||
			errorCode === COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR ||
			errorCode === COMMON_ERROR_CODES.GLOBAL_RATELIMIT_EXCEEDED
		) {
			return failure(errorCode);
		}

		// All other errors return success to prevent enumeration
		return success(undefined);
	}
}
