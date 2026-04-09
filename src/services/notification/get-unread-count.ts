'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapNotificationError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	NOTIFICATION_ERROR_CODES,
	type NotificationErrorCode,
} from '@/types/errors';
import {
	type UnreadCountResponse,
	unreadCountResponseSchema,
} from '@/types/notification';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching unread count
 */
type GetUnreadCountResponse = ServiceResponse<
	UnreadCountResponse,
	NotificationErrorCode
>;

/**
 * Fetches the unread notification count for the current user
 *
 * @returns ServiceResponse with count on success
 */
export async function getUnreadCount(): Promise<GetUnreadCountResponse> {
	try {
		const response = await authenticatedClient.get(
			'/me/notifications/unread-count',
		);

		const validated = unreadCountResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'notification', 'get-unread-count');
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
