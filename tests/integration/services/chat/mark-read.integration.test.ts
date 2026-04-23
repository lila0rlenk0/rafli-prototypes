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

const { markRead } = await import('@/services/chat/mark-read');

const CONVERSATION_ID = '01929e55-9b1a-7c32-8ae0-0000000000bb';
const MESSAGE_ID = '01929e55-9b1a-7c32-8ae0-0000000000ee';

describe('markRead', () => {
	test('returns the parsed ack on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ success: true }));

		const result = await markRead(CONVERSATION_ID, MESSAGE_ID);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.success).toBe(true);
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockPost.mockResolvedValueOnce(
			// `success` expected boolean — string triggers Zod failure.
			mockAxiosResponse({ success: 'yes' }),
		);

		const result = await markRead(CONVERSATION_ID, MESSAGE_ID);

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

		const result = await markRead(CONVERSATION_ID, MESSAGE_ID);

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

		const result = await markRead(CONVERSATION_ID, MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.CONVERSATION_NOT_MEMBER);
		}
	});

	test('maps 404 message-not-found URN to MESSAGE_NOT_FOUND', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:chat:message:not-found',
				},
			}),
		);

		const result = await markRead(CONVERSATION_ID, MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CHAT_ERROR_CODES.MESSAGE_NOT_FOUND);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await markRead(CONVERSATION_ID, MESSAGE_ID);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await markRead(CONVERSATION_ID, MESSAGE_ID);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
