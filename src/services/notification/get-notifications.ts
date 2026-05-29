'use server';

import { authenticatedClient } from '@/lib/api/client';
import { callService } from '@/lib/api/call-service';
import { buildQueryParams } from '@/lib/api/query-params';
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

/**
 * Fetches paginated notifications for the current user.
 *
 * @param query - Optional pagination parameters (limit, offset)
 * @returns ServiceResponse with notifications list on success
 */
export async function getNotifications(
	query?: NotificationQuery,
): Promise<ServiceResponse<ListNotificationsResponse, NotificationErrorCode>> {
	return callService({
		client: authenticatedClient,
		method: 'get',
		url: '/me/notifications',
		schema: listNotificationsResponseSchema,
		domain: 'notification',
		action: 'get-notifications',
		driftCode: NOTIFICATION_ERROR_CODES.VALIDATION_FAILED,
		mapError: mapNotificationError,
		config: { params: buildQueryParams(query) },
	});
}
