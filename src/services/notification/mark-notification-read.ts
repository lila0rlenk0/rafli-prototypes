'use server';

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
import { ZodError } from 'zod';

/**
 * Response type for marking notification as read
 */
type MarkNotificationReadResponse = ServiceResponse<
	MarkReadResponse,
	NotificationErrorCode
>;

/**
 * Marks a single notification as read
 *
 * @param notificationId - ID of the notification to mark as read
 * @returns ServiceResponse with success status
 */
export async function markNotificationRead(
	notificationId: string,
): Promise<MarkNotificationReadResponse> {
	try {
		const response = await authenticatedClient.post(
			`/me/notifications/${notificationId}/read`,
		);

		const validated = markReadResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'notification', 'mark-notification-read');
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
