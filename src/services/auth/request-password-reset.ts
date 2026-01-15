'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors';
import type { RequestPasswordResetInput } from '@/types/auth';
import type { AuthErrorCode } from '@/types/errors';
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

		// For network/server errors, return failure
		// For user-related errors (not found), return success
		if (
			errorCode === 'network_error' ||
			errorCode === 'timeout_error' ||
			errorCode === 'internal_server_error'
		) {
			return failure(errorCode);
		}

		// Return success for all other cases to prevent enumeration
		return success(undefined);
	}
}
