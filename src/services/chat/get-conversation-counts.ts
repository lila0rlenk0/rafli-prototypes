'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import {
	type ConversationCountsQuery,
	type ConversationCountsResponse,
	conversationCountsResponseSchema,
} from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Filter-chip counts for the inbox sidebar header.
 *
 * Mirrors the `q` param of {@link getConversations} so the badge numbers track
 * what each tab would render if selected — a search for "ada" narrows the All
 * count down to the matching rows, so the Unread / Winners / Raffles counts
 * show how many of those matches fall into each bucket.
 *
 * @param query - Optional search string (same as the list endpoint).
 * @returns ServiceResponse with per-chip counts on success.
 */
export async function getConversationCounts(
	query?: ConversationCountsQuery,
): Promise<ServiceResponse<ConversationCountsResponse, ChatErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			'/chat/conversations/counts',
			{ params: buildQueryParams(query) },
		);
		return success(conversationCountsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'get-conversation-counts');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'get-conversation-counts',
		});
		return failure(errorCode);
	}
}
