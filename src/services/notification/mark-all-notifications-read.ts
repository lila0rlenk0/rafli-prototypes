'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapNotificationError } from '@/lib/errors';
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
 * Response type for marking all notifications as read
 */
type MarkAllNotificationsReadResponse = ServiceResponse<
	MarkReadResponse,
	NotificationErrorCode
>;

/**
 * Marks all notifications as read for the current user
 *
 * @returns ServiceResponse with success status
 */
export async function markAllNotificationsRead(): Promise<MarkAllNotificationsReadResponse> {
	try {
		const response = await authenticatedClient.post(
			'/me/notifications/read-all',
		);

		const validated = markReadResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Mark all read response validation failed:', error);
			return failure(NOTIFICATION_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
