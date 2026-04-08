'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapNotificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	type EmailPreferences,
	emailPreferencesSchema,
	type UpdateEmailPreferences,
} from '@/types/email-preferences';
import {
	NOTIFICATION_ERROR_CODES,
	type NotificationErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for updating email preferences
 */
type UpdateEmailPreferencesResponse = ServiceResponse<
	EmailPreferences,
	NotificationErrorCode
>;

/**
 * Updates email notification preferences for the current user
 *
 * @param input - Partial email preferences to update
 * @returns ServiceResponse with updated email preferences on success
 */
export async function updateEmailPreferences(
	input: UpdateEmailPreferences,
): Promise<UpdateEmailPreferencesResponse> {
	try {
		const response = await authenticatedClient.patch(
			'/email/preferences',
			input,
		);
		const validated = emailPreferencesSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'notification', 'update-email-preferences');
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
