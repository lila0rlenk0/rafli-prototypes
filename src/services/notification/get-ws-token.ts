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
	type WsTokenResponse,
	wsTokenResponseSchema,
} from '@/types/notification';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches a short-lived WebSocket authentication token.
 *
 * Used for query param auth on the notification stream endpoint.
 * Each request generates a new token, invalidating previous ones.
 *
 * @returns ServiceResponse with token on success
 */
export async function getWsToken(): Promise<
	ServiceResponse<WsTokenResponse, NotificationErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/me/ws-token');
		return success(wsTokenResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'notification', 'get-ws-token');
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
