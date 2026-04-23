import { describe, expect, mock, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
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

const { getStripeSessionStatus } = await import(
	'@/services/payment/get-stripe-session-status'
);

describe('getStripeSessionStatus', () => {
	test('returns validated paid status on valid response', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ orderId: 'order-1', status: 'paid' }),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('paid');
			expect(result.data.orderId).toBe('order-1');
		}
	});

	test('returns validated unpaid status', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ orderId: 'order-1', status: 'unpaid' }),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('unpaid');
		}
	});

	test('returns validated expired status', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ orderId: 'order-1', status: 'expired' }),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('expired');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Missing `status` field — Zod parse fails
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ orderId: 'order-1' }),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('returns FETCH_FAILED on invalid status value', async () => {
		// Invalid status enum — not in ['paid', 'unpaid', 'expired']
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ orderId: 'order-1', status: 'pending' }),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps stripe-session-not-found from RFC 7807 response', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:stripe:session-not-found',
				},
			}),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.STRIPE_SESSION_NOT_FOUND,
			);
		}
	});

	test('maps permission-denied from RFC 7807 response', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:payments:stripe:permission-denied',
				},
			}),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.STRIPE_PERMISSION_DENIED,
			);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await getStripeSessionStatus('cs_test_abc');

		expect(result.success).toBe(false);
	});
});
