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
 * Marks a single notification as read.
 *
 * @param notificationId - ID of the notification to mark as read
 * @returns ServiceResponse with success status
 */
export async function markNotificationRead(
	notificationId: string,
): Promise<ServiceResponse<MarkReadResponse, NotificationErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/me/notifications/${notificationId}/read`,
		);
		return success(markReadResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'notification', 'mark-notification-read');
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
