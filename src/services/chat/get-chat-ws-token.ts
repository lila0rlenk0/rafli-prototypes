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
	type ChatWsTokenResponse,
	chatWsTokenResponseSchema,
} from '@/types/chat';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Issues a short-lived, single-use token for the chat WebSocket stream.
 *
 * Encore's streaming handshake can only read the token from the query string
 * (W3C WebSocket spec forbids custom headers), so the token is deliberately
 * NOT the JWT — it's an opaque Redis-backed key scoped to the caller's
 * userId and consumed on first use. A compromised token burns a single
 * connection and the attacker cannot re-use or re-issue it.
 *
 * Fetch a fresh token on every connect attempt; cache-level reuse is unsafe
 * because the token is invalidated server-side after validation.
 *
 * @returns ServiceResponse with `{ token, expiresIn }` on success.
 */
export async function getChatWsToken(): Promise<
	ServiceResponse<ChatWsTokenResponse, ChatErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/chat/ws-token');
		return success(chatWsTokenResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'chat', 'get-chat-ws-token');
			return failure(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		const errorCode = mapChatError(error);
		captureServiceError(error, errorCode, {
			service: 'chat',
			action: 'get-chat-ws-token',
		});
		return failure(errorCode);
	}
}
