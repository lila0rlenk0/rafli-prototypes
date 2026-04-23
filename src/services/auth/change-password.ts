'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapAuthError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import {
	changePasswordInputSchema,
	type ChangePasswordInput,
} from '@/types/auth';
import { COMMON_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
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
		// Step 1: Re-parse input — server actions are public POST endpoints,
		// attackers can append extra fields (e.g. `userId`, `role`) that could
		// be honoured by a lax backend. Zod strips unknowns and enforces the
		// 12-char policy before the request leaves the BFF.
		const validated = changePasswordInputSchema.safeParse(input);
		if (!validated.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Send password change request — backend validates current password
		await authenticatedClient.post('/auth/change-password', validated.data);

		return success(undefined);
	} catch (error) {
		// Step 3: Map and capture — auth is a critical service
		const errorCode = mapAuthError(error);
		captureServiceError(error, errorCode, {
			service: 'auth',
			action: 'change-password',
		});
		return failure(errorCode);
	}
}
