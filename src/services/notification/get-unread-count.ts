'use server';

import { authenticatedClient } from '@/lib/api/client';
import { callService } from '@/lib/api/call-service';
import { mapNotificationError } from '@/lib/errors';
import {
	NOTIFICATION_ERROR_CODES,
	type NotificationErrorCode,
} from '@/types/errors';
import {
	type UnreadCountResponse,
	unreadCountResponseSchema,
} from '@/types/notification';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches the unread notification count for the current user.
 *
 * @returns ServiceResponse with count on success
 */
export async function getUnreadCount(): Promise<
	ServiceResponse<UnreadCountResponse, NotificationErrorCode>
> {
	return callService({
		client: authenticatedClient,
		method: 'get',
		url: '/me/notifications/unread-count',
		schema: unreadCountResponseSchema,
		domain: 'notification',
		action: 'get-unread-count',
		driftCode: NOTIFICATION_ERROR_CODES.VALIDATION_FAILED,
		mapError: mapNotificationError,
	});
}
