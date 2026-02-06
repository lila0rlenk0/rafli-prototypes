'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapNotificationError, success } from '@/lib/errors';
import {
	NOTIFICATION_ERROR_CODES,
	type NotificationErrorCode,
} from '@/types/errors';
import {
	type ListNotificationsResponse,
	listNotificationsResponseSchema,
	type NotificationQuery,
} from '@/types/notification';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching notifications
 */
type GetNotificationsResponse = ServiceResponse<
	ListNotificationsResponse,
	NotificationErrorCode
>;

/**
 * Fetches paginated notifications for the current user
 *
 * @param query - Optional pagination parameters (limit, offset)
 * @returns ServiceResponse with notifications list on success
 */
export async function getNotifications(
	query?: NotificationQuery,
): Promise<GetNotificationsResponse> {
	try {
		const params = buildQueryParams(query);
		const response = await authenticatedClient.get('/me/notifications', {
			params,
		});

		const validated = listNotificationsResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Notification response validation failed:', error);
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
