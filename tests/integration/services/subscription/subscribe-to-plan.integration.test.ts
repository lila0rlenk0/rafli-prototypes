import { describe, expect, mock, test } from 'bun:test';

import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();
const mockTrackServer = mock(() => Promise.resolve());

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));

// All session exports required — Bun's global mock.module() caches these,
// so partial mocks contaminate siblings. Match the production surface exactly.
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => Promise.resolve({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mockTrackServer,
	trackAfter: mock(),
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

mock.module('@/lib/utils/run-after', () => ({
	runAfter: (task: () => void | Promise<void>) => void task(),
}));

mock.module('@/env/server', () => ({
	env: { APP_URL: 'https://raffly.test' },
}));

const { subscribeToPlan } = await import(
	'@/services/subscription/subscribe-to-plan'
);

const VALID_PLAN_ID = '01929e55-9b1a-7c32-8ae0-0123456789ab';
const VALID_PAYLOAD = {
	planId: VALID_PLAN_ID,
	provider: 'stripe' as const,
};
const VALID_FANBASIS_PAYLOAD = {
	planId: VALID_PLAN_ID,
	provider: 'fanbasis' as const,
};
const VALID_RESPONSE = {
	checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_sub',
	provider: 'stripe' as const,
};
const VALID_FANBASIS_RESPONSE = {
	checkoutUrl: 'https://app.fanbasis.com/checkout/abc',
	provider: 'fanbasis' as const,
};

describe('subscribeToPlan', () => {
	test('returns checkoutUrl + provider on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await subscribeToPlan(VALID_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.checkoutUrl).toBe(VALID_RESPONSE.checkoutUrl);
			expect(result.data.provider).toBe('stripe');
		}
	});

	test('hits POST /subscriptions with provider, planId, and Stripe redirects', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await subscribeToPlan(VALID_PAYLOAD);

		const [path, body] =
			mockPost.mock.calls[mockPost.mock.calls.length - 1] ?? [];
		expect(path).toBe('/subscriptions');
		// Stripe path always carries `cancelUrl` — the dispatcher rejects
		// Stripe-without-cancelUrl with `payments:subscription:checkout-failed`.
		expect(body).toEqual({
			provider: 'stripe',
			planId: VALID_PLAN_ID,
			successUrl: 'https://raffly.test/pricing?status=success',
			cancelUrl: 'https://raffly.test/pricing?status=cancel',
		});
	});

	test('omits cancelUrl on the Fanbasis path', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_FANBASIS_RESPONSE));

		await subscribeToPlan(VALID_FANBASIS_PAYLOAD);

		const [, body] = mockPost.mock.calls[mockPost.mock.calls.length - 1] ?? [];
		// Fanbasis hosted checkout has no cancel hook (the buyer aborts by
		// closing the tab), so the dispatcher silently ignores the field —
		// we omit it on the wire to keep the request explicit.
		expect(body).toEqual({
			provider: 'fanbasis',
			planId: VALID_PLAN_ID,
			successUrl: 'https://raffly.test/pricing?status=success',
		});
	});

	test('returns PLAN_NOT_FOUND when payload fails local validation', async () => {
		// Bad UUID — safeParse fails, no network call made.
		const result = await subscribeToPlan({
			planId: 'not-a-uuid',
			provider: 'stripe',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND);
		}
	});

	test('returns FETCH_FAILED on response shape drift', async () => {
		mockCaptureContractDrift.mockReset();
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ url: 'wrong-field' }));

		const result = await subscribeToPlan(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps already-subscribed from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 412,
				data: {
					type: 'urn:raffles:problem:payments:subscription:already-subscribed',
				},
			}),
		);

		const result = await subscribeToPlan(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.ALREADY_SUBSCRIBED);
		}
	});

	test('maps plan-not-found from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:subscription:plan-not-found',
				},
			}),
		);

		const result = await subscribeToPlan(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND);
		}
	});

	test('maps unauthenticated to global:auth:unauthenticated', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await subscribeToPlan(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await subscribeToPlan(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await subscribeToPlan(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
