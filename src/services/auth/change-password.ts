'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import type { ChangePasswordInput } from '@/types/auth';
import type { AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for password change
 */
type ChangePasswordResponse = ServiceResponse<void, AuthErrorCode>;

/**
 * Changes user password (requires authentication)
 * Validates current password before setting new password
 *
 * @param input - Current and new password
 * @returns ServiceResponse with void on success, AuthErrorCode on failure
 */
export async function changePassword(
	input: ChangePasswordInput,
): Promise<ChangePasswordResponse> {
	try {
		await authenticatedClient.post('/auth/change-password', input);

		return success(undefined);
	} catch (error) {
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'change-password',
		});
		return failure(errorCode);
	}
}
