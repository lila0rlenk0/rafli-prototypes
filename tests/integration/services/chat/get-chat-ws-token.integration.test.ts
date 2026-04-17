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

const { getChatWsToken } = await import('@/services/chat/get-chat-ws-token');

const VALID_RESPONSE = {
	expiresIn: 60,
	token: 'opaque-single-use-key',
};

describe('getChatWsToken', () => {
	test('returns the parsed token on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getChatWsToken();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.token).toBe(VALID_RESPONSE.token);
			expect(result.data.expiresIn).toBe(60);
		}
	});

	test('returns VALIDATION_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			// `expiresIn` must be number — string triggers Zod failure.
			mockAxiosResponse({ token: 'x', expiresIn: '60' }),
		);

		const result = await getChatWsToken();

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

		const result = await getChatWsToken();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('maps 403 without chat URN to forbidden fallback', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

		const result = await getChatWsToken();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('forbidden');
		}
	});

	test('maps 503 ws token-service-unavailable URN to chat code', async () => {
		// The backend surfaces a dedicated URN for WS token exhaustion —
		// assert it lands on `WS_TOKEN_SERVICE_UNAVAILABLE` (not the generic
		// 503 `service_unavailable` fallback).
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 503,
				data: {
					type: 'urn:raffles:problem:chat:ws:token-service-unavailable',
				},
			}),
		);

		const result = await getChatWsToken();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				CHAT_ERROR_CODES.WS_TOKEN_SERVICE_UNAVAILABLE,
			);
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getChatWsToken();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getChatWsToken();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
