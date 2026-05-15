import { describe, expect, mock, test } from 'bun:test';

import { FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES } from '@/types/errors/fanbasis-public-subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// =============================================================================
// MODULE MOCKS
// =============================================================================
//
// The action posts to our backend
// (`/payments/fanbasis/public-subscription-checkout`) via `baseClient`, so
// the mock target is the shared API client. The backend brokers the Fanbasis
// API key on the server-side; the FE never holds it. Body carries the
// magic-link recipient email plus the plan slug forwarded by the caller
// (Basic / Starter / Pro landing page); card details are still collected on
// Fanbasis's hosted page after the FE redirects.

const mockPost = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

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

const { createFanbasisPublicSubscriptionCheckout } = await import(
	'@/services/payment/create-fanbasis-public-subscription-checkout'
);

// =============================================================================
// FIXTURES
// =============================================================================

/**
 * Backend response shape after the broker mints the Fanbasis hosted-redirect
 * subscription session. Mirrors `FanbasisPublicSubscriptionCheckoutResponseDto`
 * — single field, no session id, no `expiresAt`. The recurring billing
 * cadence is fully owned by the backend + Fanbasis; the FE only needs the
 * redirect URL.
 */
const VALID_BACKEND_RESPONSE = {
	checkoutUrl: 'https://www.fanbasis.com/agency-checkout/handle/NLxj6',
};

/**
 * Slugs the route layer pins per landing page. The action now forwards
 * whichever slug the caller supplied, so the body-contract test below
 * exercises all three to lock the wire-level shape against drift.
 */
const PLAN_SLUGS = {
	BASIC: 'basic_access_pass',
	STARTER: 'starter_access_pass',
	PRO: 'pro_access_pass',
} as const;

describe('createFanbasisPublicSubscriptionCheckout', () => {
	test('forwards the hosted-redirect URL on happy path', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_BACKEND_RESPONSE));

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(VALID_BACKEND_RESPONSE);
		}
	});

	test('forwards the email and caller-supplied planSlug in the request body', async () => {
		// Locking the body contract prevents drop/rename of the magic-link
		// email field (which the backend forwards to Fanbasis as session
		// metadata for webhook routing) and proves the caller-supplied slug
		// reaches the wire intact — the route layer pins one slug per landing
		// page, so a regression here would silently downgrade Starter / Pro
		// buyers onto the Basic tier.
		for (const planSlug of [
			PLAN_SLUGS.BASIC,
			PLAN_SLUGS.STARTER,
			PLAN_SLUGS.PRO,
		]) {
			mockPost.mockClear();
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_BACKEND_RESPONSE));

			await createFanbasisPublicSubscriptionCheckout({
				captchaToken: 'test-captcha-token',
				email: 'buyer@example.com',
				planSlug,
			});

			// Bun types `mock.calls` as `[][]`; widen via `unknown` to read the
			// recorded `(url, body, config)` tuple without `as never`.
			const calls = mockPost.mock.calls as unknown as ReadonlyArray<
				readonly [string, Record<string, unknown>, unknown]
			>;
			const [url, body] = calls[0];
			expect(url).toBe('/payments/fanbasis/public-subscription-checkout');
			expect(body).toEqual({
				email: 'buyer@example.com',
				planSlug,
			});
		}
	});

	test('forwards the captcha token as the x-captcha-response header', async () => {
		// Token must travel as a header — the backend's Turnstile verifier
		// reads it via Encore `Header<>` parsing before the body parser
		// runs, so smuggling it in the body would bypass the gate entirely.
		mockPost.mockClear();
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_BACKEND_RESPONSE));

		await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		const calls = mockPost.mock.calls as unknown as ReadonlyArray<
			readonly [
				string,
				Record<string, unknown>,
				{ headers?: Record<string, unknown> },
			]
		>;
		const [, , config] = calls[0];
		expect(config.headers?.['x-captcha-response']).toBe('test-captcha-token');
	});

	test('rejects malformed email before hitting the backend', async () => {
		// Server-side revalidation backs the FE form's Zod gate — a tampered
		// or non-form caller passing `email: "not-an-email"` short-circuits
		// to FETCH_FAILED without burning a backend round-trip.
		mockPost.mockClear();

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'not-an-email',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.FETCH_FAILED,
			);
		}
		expect(mockPost).not.toHaveBeenCalled();
	});

	test('rejects empty captcha token before hitting the backend', async () => {
		// Captcha is required by the backend (`X-Captcha-Response` without
		// the `?` modifier). The FE button is disabled until the widget
		// resolves a token, so an empty value here means the input was
		// tampered with after the gate.
		mockPost.mockClear();

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: '',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.FETCH_FAILED,
			);
		}
		expect(mockPost).not.toHaveBeenCalled();
	});

	test('rejects malformed planSlug before hitting the backend', async () => {
		// Backend DTO enforces `/^[a-z0-9_]+$/` and ≤64 chars; the FE
		// pre-validates against the same regex so a tampered caller (mixed
		// case, dashes, SQL fragments) fails fast without burning a round
		// trip. Defence-in-depth against route-level constants drifting from
		// the backend slug catalog.
		mockPost.mockClear();

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: 'Basic-Access-Pass',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.FETCH_FAILED,
			);
		}
		expect(mockPost).not.toHaveBeenCalled();
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Backend drift on `checkoutUrl` surfaces as a contract drift Sentry
		// capture and a generic "try again" toast on the FE.
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ id: 'fb_session_xyz' }),
		);
		mockCaptureContractDrift.mockReset();

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.FETCH_FAILED,
			);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalled();
	});

	test('maps rate-limited URN to RATE_LIMITED', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 429,
				data: { type: 'urn:raffles:problem:payments:fanbasis:rate-limited' },
			}),
		);

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.RATE_LIMITED,
			);
		}
	});

	test('maps checkout-failed URN to CHECKOUT_FAILED', async () => {
		// Backend collapses three cases onto this URN: transient upstream
		// failure, existing-email enumeration shield, and per-IP daily-cap
		// exhaustion. FE handling is uniform — generic "try again" copy.
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:fanbasis:checkout-failed',
				},
			}),
		);

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.CHECKOUT_FAILED,
			);
		}
	});

	test('maps plan-not-found URN to PLAN_NOT_FOUND', async () => {
		// Backend raises this deterministically when the slug doesn't
		// resolve to an active plan row. The catalog is public, so the URN
		// surfaces directly rather than being collapsed into the
		// enumeration shield. Reaching this branch implies either a stale
		// slug constant on the FE or a plan deactivated by ops.
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:subscription:plan-not-found',
				},
			}),
		);

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND,
			);
		}
	});

	test('maps provider-not-supported URN to PROVIDER_NOT_SUPPORTED', async () => {
		// Backend raises this when `fanbasisProductId` is NULL on the
		// resolved plan — ops hasn't provisioned the Fanbasis product yet
		// even though the slug matched. Distinct from `plan-not-found` so
		// the FE can render plan-vs-provider copy if needed.
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 412,
				data: {
					type: 'urn:raffles:problem:payments:subscription:provider-not-supported',
				},
			}),
		);

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
			);
		}
	});

	test('maps gateway rate-limit URN through global fallback', async () => {
		// `ratelimit:strict` tag on the endpoint can also produce the
		// gateway-side global URN (per-IP cap on our edge) — distinct from
		// the Fanbasis-issued 429. Mapper accepts the `global:` prefix so
		// the FE can render the appropriate cooldown copy without falling
		// through to `unknown_error`.
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 429,
				data: { type: 'urn:raffles:problem:global:ratelimit:exceeded' },
			}),
		);

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:ratelimit:exceeded');
		}
	});

	test('captures Sentry on 500', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error through CommonErrorCode fallback', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});

	test('maps timeout through CommonErrorCode fallback', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await createFanbasisPublicSubscriptionCheckout({
			captchaToken: 'test-captcha-token',
			email: 'buyer@example.com',
			planSlug: PLAN_SLUGS.BASIC,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('timeout_error');
		}
	});
});
