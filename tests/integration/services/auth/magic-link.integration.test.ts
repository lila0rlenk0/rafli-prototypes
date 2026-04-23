import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Mocks ---
// magic-link.ts is 'use client' and uses browserClient from @/lib/api/browser-client

const mockPost = mock();
const mockCaptureServiceError = mock();

mock.module('@/lib/api/browser-client', () => ({
	browserClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));
mock.module('@/lib/analytics/mixpanel-client', () => ({
	track: mock(),
}));

const { sendMagicLink } = await import('@/services/auth/magic-link');

describe('sendMagicLink', () => {
	test('returns success on valid request', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({}));

		const result = await sendMagicLink(
			'test@example.com',
			'https://app.test/auth/callback',
		);

		expect(result.success).toBe(true);
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await sendMagicLink(
			'test@example.com',
			'https://app.test/auth/callback',
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await sendMagicLink(
			'test@example.com',
			'https://app.test/auth/callback',
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await sendMagicLink(
			'test@example.com',
			'https://app.test/auth/callback',
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		const axiosError = mockAxiosError({ status: 500 });
		mockPost.mockRejectedValueOnce(axiosError);

		await sendMagicLink(
			'test@example.com',
			'https://app.test/auth/callback',
		);

		expect(mockCaptureServiceError).toHaveBeenCalledWith(
			axiosError,
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'auth', action: 'magic-link-send' },
		);
	});
});
