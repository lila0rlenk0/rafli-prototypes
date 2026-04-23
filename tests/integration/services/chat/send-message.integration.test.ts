import { describe, expect, mock, test } from 'bun:test';

import { CHAT_ERROR_CODES } from '@/types/errors/chat-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mock(),
		post: mockPost,
		patch: mock(),
		delete: mock(),
	},
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

const { sendMessage } = await import('@/services/chat/send-message');

const CONVERSATION_ID = '01929e55-9b1a-7c32-8ae0-0000000000bb';

const VALID_MESSAGE = {
	body: 'hello',
	conversationId: CONVERSATION_ID,
	createdAt: '2026-04-01T00:00:00Z',
	deletedAt: null,
	editedAt: null,
	id: '01929e55-9b1a-7c32-8ae0-0000000000ee',
	mediaType: null,
	mediaUrl: null,
	metadata: null,
	senderId: '01929e55-9b1a-7c32-8ae0-0000000000aa',
	type: 'text',
};

describe('sendMessage', () => {
	test('returns the parsed message on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_MESSAGE));

		const result = await sendMessage(CONVERSATION_ID, { body: 'hello' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe(VALID_MESSAGE.id);
			expect(result.data.body).toBe('hello');
		}
	});

	test('returns MESSAGE_INVALID_BODY for empty body without hitting the network', async () => {
		// safeParse guard at the top of `sendMessage` short-circuits before any
		// authenticatedClient.post is issued — we assert the call count stays 0
		// to pin down the no-network contract.
		mockPost.mockReset();

		const result = await sendMessage(CONVERSATION_ID, { body: '' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.MESSAGE_INVALID_BODY);
		}
		expect(mockPost).not.toHaveBeenCalled();
	});

	test('returns VALIDATION_FAILED and captures contract drift on response shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockPost.mockResolvedValueOnce(
			// `type` invalid — enum rejection triggers Zod branch.
			mockAxiosResponse({ ...VALID_MESSAGE, type: 'unknown_kind' }),
		);

		const result = await sendMessage(CONVERSATION_ID, { body: 'hello' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps 401 to global:auth:unauthenticated', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await sendMessage(CONVERSATION_ID, { body: 'hello' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 not-member URN to chat code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:chat:conversation:not-member',
				},
			}),
		);

		const result = await sendMessage(CONVERSATION_ID, { body: 'hello' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_MEMBER);
		}
	});

	test('maps 404 not-found URN to CONVERSATION_NOT_FOUND', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:chat:conversation:not-found',
				},
			}),
		);

		const result = await sendMessage(CONVERSATION_ID, { body: 'hello' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_FOUND);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await sendMessage(CONVERSATION_ID, { body: 'hello' });

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await sendMessage(CONVERSATION_ID, { body: 'hello' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
