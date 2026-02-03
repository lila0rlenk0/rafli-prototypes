'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapNotificationError } from '@/lib/errors';
import {
	NOTIFICATION_ERROR_CODES,
	type NotificationErrorCode,
} from '@/types/errors';
import {
	type WsTokenResponse,
	wsTokenResponseSchema,
} from '@/types/notification';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching WebSocket token
 */
type GetWsTokenResponse = ServiceResponse<WsTokenResponse, NotificationErrorCode>;

/**
 * Fetches a short-lived WebSocket authentication token
 *
 * Token is used for query param auth on notification stream endpoint.
 * Each request generates a new token, invalidating previous ones.
 *
 * @returns ServiceResponse with token on success
 */
export async function getWsToken(): Promise<GetWsTokenResponse> {
	try {
		const response = await authenticatedClient.get('/me/ws-token');

		const validated = wsTokenResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('WS token response validation failed:', error);
			return failure(NOTIFICATION_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapNotificationError(error));
	}
}
