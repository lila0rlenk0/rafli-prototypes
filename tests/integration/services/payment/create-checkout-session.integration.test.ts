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

mock.module('@/lib/utils/run-after', () => ({
	runAfter: (task: () => void | Promise<void>) => void task(),
}));

// Mock env for APP_URL used in URL construction
mock.module('@/env/server', () => ({
	env: { APP_URL: 'https://raffly.test' },
}));

const { createCheckoutSession } = await import(
	'@/services/payment/create-checkout-session'
);

const VALID_PAYLOAD = {
	orderId: '550e8400-e29b-71d4-a716-446655440000',
	publicSlug: 'cool-raffle-abc123',
};

const VALID_RESPONSE = {
	id: '550e8400-e29b-71d4-a716-446655440001',
	checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_abc',
	orderId: '550e8400-e29b-71d4-a716-446655440000',
	expiresAt: '2026-04-09T12:30:00.000Z',
	previousSessionCancelled: false,
};

describe('createCheckoutSession', () => {
	test('returns validated checkout session on valid response', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await createCheckoutSession(VALID_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.checkoutUrl).toBe(
				'https://checkout.stripe.com/pay/cs_test_abc',
			);
			expect(result.data.orderId).toBe(VALID_PAYLOAD.orderId);
			expect(result.data.previousSessionCancelled).toBe(false);
		}
	});

	test('returns CHECKOUT_FAILED on invalid payload', async () => {
		// Missing orderId — safeParse fails early before network call
		const result = await createCheckoutSession({
			orderId: 'not-a-uuid',
			publicSlug: 'slug',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CHECKOUT_FAILED);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Missing checkoutUrl — Zod parse fails
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ id: '550e8400-e29b-71d4-a716-446655440001' }),
		);

		const result = await createCheckoutSession(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps checkout-failed from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:payments:checkout:failed',
				},
			}),
		);

		const result = await createCheckoutSession(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CHECKOUT_FAILED);
		}
	});

	test('maps crypto-session-active from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: {
					type: 'urn:raffles:problem:payments:stripe:crypto-session-active',
				},
			}),
		);

		const result = await createCheckoutSession(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.STRIPE_CRYPTO_SESSION_ACTIVE,
			);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createCheckoutSession(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await createCheckoutSession(VALID_PAYLOAD);

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await createCheckoutSession(VALID_PAYLOAD);

		expect(result.success).toBe(false);
	});
});
