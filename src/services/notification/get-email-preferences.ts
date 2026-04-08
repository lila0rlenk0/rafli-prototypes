'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapNotificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	type EmailPreferences,
	emailPreferencesSchema,
} from '@/types/email-preferences';
import {
	NOTIFICATION_ERROR_CODES,
	type NotificationErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching email preferences
 */
type GetEmailPreferencesResponse = ServiceResponse<
	EmailPreferences,
	NotificationErrorCode
>;

/**
 * Fetches email notification preferences for the current user
 *
 * @returns ServiceResponse with email preferences on success
 */
export async function getEmailPreferences(): Promise<GetEmailPreferencesResponse> {
	try {
		const response = await authenticatedClient.get('/email/preferences');
		const validated = emailPreferencesSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'notification', 'get-email-preferences');
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
