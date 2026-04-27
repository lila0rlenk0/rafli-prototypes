import { describe, expect, mock, test } from 'bun:test';

import { FANBASIS_PUBLIC_CREDIT_ERROR_CODES } from '@/types/errors/fanbasis-public-credit-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// =============================================================================
// MODULE MOCKS
// =============================================================================
//
// The action posts to our backend (`/payments/fanbasis/public-credit-checkout`)
// via `baseClient`, so the mock target is the shared API client. The backend
// brokers the Fanbasis API key on the server-side; the FE never holds it.
// Body is empty by design — the embedded Fanbasis iframe collects email +
// card + terms internally, so the action sends `{}`.

const mockPost = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();
const mockTrackAfter = mock(() => Promise.resolve());

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mock(), post: mockPost },
}));

mock.module('@/lib/auth/session', () => ({
	getSession: mock(),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(() => Promise.resolve()),
	trackAfter: mockTrackAfter,
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

const { createFanbasisPublicCreditCheckout } = await import(
	'@/services/payment/create-fanbasis-public-credit-checkout'
);

// =============================================================================
// FIXTURES
// =============================================================================

/**
 * Backend response shape after the broker mints the Fanbasis embedded
 * session. Mirrors `FanbasisPublicCreditCheckoutResponseDto` in the
 * raffles-core-backend repo — only the four fields the embedded SDK
 * needs to mount `<CheckoutProvider>`. No `id`, `expiresAt`, or
 * correlation surface on the wire (those are server-internal).
 */
const VALID_BACKEND_RESPONSE = {
	checkoutSessionSecret: 'cs_live_01HXYZsecretvalue',
	creatorId: 'mode-mobile',
	environment: 'sandbox' as const,
	productId: 'ZVABE',
};

describe('createFanbasisPublicCreditCheckout', () => {
	test('forwards the embed config on happy path', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_BACKEND_RESPONSE));

		const result = await createFanbasisPublicCreditCheckout();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(VALID_BACKEND_RESPONSE);
		}
	});

	test('posts an empty body to the backend', async () => {
		// Email + card + terms acceptance live inside the embedded Fanbasis
		// iframe — the session-mint endpoint receives no client-supplied
		// data. This guard makes a regression that smuggles a payload
		// (e.g. revives the old `email` field) impossible to ship silently.
		mockPost.mockClear();
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_BACKEND_RESPONSE));

		await createFanbasisPublicCreditCheckout();

		// Bun types `mock.calls` as `[][]`; widen via `unknown` to read the
		// recorded `(url, body, config)` tuple without `as never`.
		const calls = mockPost.mock.calls as unknown as ReadonlyArray<
			readonly [string, Record<string, unknown>, unknown]
		>;
		const [url, body] = calls[0];
		expect(url).toBe('/payments/fanbasis/public-credit-checkout');
		expect(body).toEqual({});
	});

	test('does not include email in failure analytics', async () => {
		// Pre-iframe-submit, the FE has no email to attribute the funnel
		// failure to — guarding here keeps a future regression that adds
		// `email: payload.email` (e.g. copying from a sibling action) from
		// silently leaking unvalidated user input to Mixpanel.
		mockTrackAfter.mockClear();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		await createFanbasisPublicCreditCheckout();

		expect(mockTrackAfter).toHaveBeenCalled();
		const calls = mockTrackAfter.mock.calls as unknown as ReadonlyArray<
			readonly [unknown, Record<string, unknown> | undefined]
		>;
		for (const [, props] of calls) {
			expect(props).not.toHaveProperty('email');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Backend drift on any load-bearing field surfaces as a contract
		// drift Sentry capture and a generic "try again" toast on the FE.
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ id: 'fb_session_xyz' }),
		);
		mockCaptureContractDrift.mockReset();

		const result = await createFanbasisPublicCreditCheckout();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_CREDIT_ERROR_CODES.FETCH_FAILED,
			);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalled();
	});

	test('maps rate-limited URN to RATE_LIMITED', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 429,
				data: {
					type: 'urn:raffles:problem:payments:fanbasis:rate-limited',
				},
			}),
		);

		const result = await createFanbasisPublicCreditCheckout();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_CREDIT_ERROR_CODES.RATE_LIMITED,
			);
		}
	});

	test('maps checkout-failed URN to CHECKOUT_FAILED', async () => {
		// Backend's `unavailable` for transient upstream issues (5xx,
		// network, timeout, contract drift). FE shows retry copy; the
		// iframe stays mounted.
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 503,
				data: {
					type: 'urn:raffles:problem:payments:fanbasis:checkout-failed',
				},
			}),
		);

		const result = await createFanbasisPublicCreditCheckout();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_CREDIT_ERROR_CODES.CHECKOUT_FAILED,
			);
		}
	});

	test('captures Sentry on 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createFanbasisPublicCreditCheckout();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error through CommonErrorCode fallback', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await createFanbasisPublicCreditCheckout();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});

	test('maps timeout through CommonErrorCode fallback', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await createFanbasisPublicCreditCheckout();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('timeout_error');
		}
	});
});
