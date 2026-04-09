'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapNotificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	NOTIFICATION_ERROR_CODES,
	type NotificationErrorCode,
} from '@/types/errors';
import {
	type MarkReadResponse,
	markReadResponseSchema,
} from '@/types/notification';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Marks all notifications as read for the current user.
 *
 * @returns ServiceResponse with success status
 */
export async function markAllNotificationsRead(): Promise<
	ServiceResponse<MarkReadResponse, NotificationErrorCode>
> {
	try {
		const response = await authenticatedClient.post(
			'/me/notifications/read-all',
		);
		return success(markReadResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(
				error,
				'notification',
				'mark-all-notifications-read',
			);
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
