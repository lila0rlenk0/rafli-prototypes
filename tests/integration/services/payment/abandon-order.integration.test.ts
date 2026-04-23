import { describe, expect, mock, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();
const mockCaptureServiceError = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));

// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => Promise.resolve({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(() => Promise.resolve()),
	trackAfter: mock(),
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));

const { abandonOrder } = await import('@/services/payment/abandon-order');

describe('abandonOrder', () => {
	test('returns validated abandon result on valid response', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ abandoned: true }),
		);

		const result = await abandonOrder('order-1', 'crypto');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.abandoned).toBe(true);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Missing `abandoned` boolean — Zod parse fails
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ status: 'ok' }));

		const result = await abandonOrder('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps abandon-crypto-active from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: {
					type: 'urn:raffles:problem:payments:abandon:crypto-active',
				},
			}),
		);

		const result = await abandonOrder('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.ABANDON_CRYPTO_ACTIVE);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ status: 500 }),
		);

		const result = await abandonOrder('order-1');

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await abandonOrder('order-1');

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await abandonOrder('order-1');

		expect(result.success).toBe(false);
	});
});
