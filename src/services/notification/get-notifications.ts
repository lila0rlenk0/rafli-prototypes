'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/query-params';
import { failure, mapNotificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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

/**
 * Fetches paginated notifications for the current user.
 *
 * @param query - Optional pagination parameters (limit, offset)
 * @returns ServiceResponse with notifications list on success
 */
export async function getNotifications(
	query?: NotificationQuery,
): Promise<ServiceResponse<ListNotificationsResponse, NotificationErrorCode>> {
	try {
		const response = await authenticatedClient.get('/me/notifications', {
			params: buildQueryParams(query),
		});
		return success(listNotificationsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'notification', 'get-notifications');
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
