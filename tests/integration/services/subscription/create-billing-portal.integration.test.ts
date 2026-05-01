import { describe, expect, mock, test } from 'bun:test';

import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

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

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

mock.module('@/env/server', () => ({
	env: { APP_URL: 'https://raffly.test' },
}));

const { createBillingPortal } = await import(
	'@/services/subscription/create-billing-portal'
);

const VALID_RESPONSE = {
	url: 'https://billing.stripe.com/p/session/test_abc',
};

describe('createBillingPortal', () => {
	test('returns Stripe Customer Portal URL on success', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await createBillingPortal();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.url).toBe(VALID_RESPONSE.url);
		}
	});

	test('builds canonical returnUrl under APP_URL', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await createBillingPortal();

		const [path, body] =
			mockPost.mock.calls[mockPost.mock.calls.length - 1] ?? [];
		expect(path).toBe('/subscriptions/portal');
		expect(body).toEqual({
			returnUrl: 'https://raffly.test/pricing',
		});
	});

	test('returns FETCH_FAILED on response shape drift', async () => {
		mockCaptureContractDrift.mockReset();
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ portalUrl: 'wrong' }));

		const result = await createBillingPortal();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps no-customer from RFC 7807 404 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:subscription:no-customer',
				},
			}),
		);

		const result = await createBillingPortal();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.NO_CUSTOMER);
		}
	});

	test('maps unauthenticated to global:auth:unauthenticated', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: { code: 'unauthenticated' },
			}),
		);

		const result = await createBillingPortal();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createBillingPortal();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await createBillingPortal();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});

	test('maps timeout error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await createBillingPortal();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('timeout_error');
		}
	});
});
