'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapChatError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { pathParam } from '@/lib/utils/routing/path-param';
import { CHAT_ERROR_CODES, type ChatErrorCode } from '@/types/errors';
import { type Conversation, conversationSchema } from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches the winner-chat conversation for a raffle by its raffle ID.
 *
 * Primary entry point for the winner and the host from outside `/messages`
 * (e.g. a deep-link from a notification). The backend returns 403
 * `chat:conversation:not-member` for non-members — the platform keeps the
 * winner list confidential by refusing to enumerate members to anyone
 * outside the conversation.
 *
 * @param raffleId - UUID of the raffle.
 * @returns ServiceResponse with the winner-chat conversation on success.
 */
export async function getWinnerChat(
	raffleId: string,
): Promise<ServiceResponse<Conversation, ChatErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/chat/raffle/${pathParam(raffleId)}/winner-chat`,
		);
		return success(conversationSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'get-winner-chat');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'get-winner-chat',
		});
		return failure(errorCode);
	}
}
