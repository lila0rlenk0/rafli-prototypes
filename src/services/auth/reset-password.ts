'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors';
import type { ResetPasswordInput } from '@/types/auth';
import type { AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for password reset completion
 */
type ResetPasswordResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Resets user password using token from email
 * Throws if token is invalid or expired
 *
 * @param input - Reset token and new password
 * @returns ServiceResponse with void data on success, AuthErrorCode on failure
 */
export async function resetPassword(
	input: ResetPasswordInput,
): Promise<ResetPasswordResponse> {
	try {
		await baseClient.post('/api/auth/reset-password', input);

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);
		return failure(errorCode);
	}
}
