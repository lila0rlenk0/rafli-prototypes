'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapNotificationError } from '@/lib/errors';
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
		const params = new URLSearchParams();
		if (query?.limit) params.set('limit', String(query.limit));
		if (query?.offset) params.set('offset', String(query.offset));

		const url = `/me/notifications${params.toString() ? `?${params}` : ''}`;
		const response = await authenticatedClient.get(url);

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
