import { describe, expect, mock, test } from 'bun:test';

import { CHAT_ERROR_CODES } from '@/types/errors/chat-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mockGet,
		post: mock(),
		patch: mock(),
		delete: mock(),
	},
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

const { getMessages } = await import('@/services/chat/get-messages');

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

const VALID_RESPONSE = {
	hasMore: false,
	messages: [VALID_MESSAGE],
};

describe('getMessages', () => {
	test('returns the parsed message page on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMessages(CONVERSATION_ID);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.messages).toHaveLength(1);
			expect(result.data.hasMore).toBe(false);
			expect(result.data.messages[0]?.body).toBe('hello');
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			// `messages` omitted — Zod parse fails.
			mockAxiosResponse({ hasMore: false }),
		);

		const result = await getMessages(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.VALIDATION_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps 401 to global:auth:unauthenticated', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await getMessages(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 not-member URN to chat code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:chat:conversation:not-member',
				},
			}),
		);

		const result = await getMessages(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_MEMBER);
		}
	});

	test('maps 404 not-found URN to CONVERSATION_NOT_FOUND', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:chat:conversation:not-found',
				},
			}),
		);

		const result = await getMessages(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_FOUND);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getMessages(CONVERSATION_ID);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getMessages(CONVERSATION_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
