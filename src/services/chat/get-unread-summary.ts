'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import {
	type UnreadSummaryResponse,
	unreadSummaryResponseSchema,
} from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches the unread count across all conversations plus per-conversation
 * breakdown. Used to hydrate the navbar chat badge on mount and to refresh
 * it after WS disconnects.
 *
 * @returns ServiceResponse with `totalUnread` and per-conversation counts.
 */
export async function getUnreadSummary(): Promise<
	ServiceResponse<UnreadSummaryResponse, ChatErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/chat/unread');
		return success(unreadSummaryResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'get-unread-summary');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'get-unread-summary',
		});
		return failure(errorCode);
	}
}
