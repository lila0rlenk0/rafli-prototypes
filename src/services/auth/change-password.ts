'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import type { ChangePasswordInput } from '@/types/auth';
import type { AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Changes user password (requires authentication)
 * Validates current password before setting new password
 *
 * @param input - Current and new password
 * @returns ServiceResponse with void on success, AuthErrorCode on failure
 */
export async function changePassword(
	input: ChangePasswordInput,
): Promise<ServiceResponse<void, AuthErrorCode>> {
	try {
		// Step 1: Send password change request — backend validates current password
		await authenticatedClient.post('/auth/change-password', input);

		return success(undefined);
	} catch (error) {
		// Step 2: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'change-password',
		});
		return failure(errorCode);
	}
}
