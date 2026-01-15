'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors';
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
		await baseClient.post('/api/auth/forget-password', input);

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);

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
