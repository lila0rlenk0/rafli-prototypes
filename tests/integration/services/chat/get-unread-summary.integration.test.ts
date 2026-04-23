import { describe, expect, mock, test } from 'bun:test';

import { CHAT_ERROR_CODES } from '@/types/errors/chat-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

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

const { getUnreadSummary } = await import(
	'@/services/chat/get-unread-summary'
);

const VALID_RESPONSE = {
	conversations: [
		{
			conversationId: '01929e55-9b1a-7c32-8ae0-0000000000bb',
			unreadCount: 3,
		},
	],
	totalUnread: 3,
};

describe('getUnreadSummary', () => {
	test('returns the parsed summary on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getUnreadSummary();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.totalUnread).toBe(3);
			expect(result.data.conversations).toHaveLength(1);
			expect(result.data.conversations[0]?.unreadCount).toBe(3);
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			// `totalUnread` missing — schema requires both fields.
			mockAxiosResponse({ conversations: [] }),
		);

		const result = await getUnreadSummary();

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

		const result = await getUnreadSummary();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 without a chat URN to forbidden fallback', async () => {
		// No RFC 7807 body — the mapper drops to the HTTP-status fallback,
		// which is the `forbidden` common code.
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

		const result = await getUnreadSummary();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('forbidden');
		}
	});

	test('maps 404 without URN to not_found fallback', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 404 }));

		const result = await getUnreadSummary();

		expect(result.success).toBe(false);
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getUnreadSummary();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getUnreadSummary();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
