import { describe, expect, mock, test } from 'bun:test';

import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

const { getMySubscription } = await import(
	'@/services/subscription/get-my-subscription'
);

// UUIDv7 prefix `01…7` so z.uuidv7() accepts it.
const VALID_PLAN = {
	id: '01929e55-9b1a-7c32-8ae0-0123456789ab',
	name: 'Pro',
	monthlyPriceAmount: '49.0000',
	creditAmount: '50.0000',
	discountPercent: 25,
	metadata: {
		badgeText: '25% OFF',
		highlightLabel: 'BEST VALUE',
		isHighlighted: true,
		sortOrder: 2,
		tagline: '50 credits / month, 25% off every ticket',
		features: [
			{ text: '50 credits every month', tag: null },
			{ text: '25% off all tickets', tag: 'LIMITED OFFER' },
		],
	},
};

// Wire envelope mirrors `GetSubscriptionResponseDto` on the backend — the
// entity sits inside a `subscription` wrapper so the no-sub state can be a
// 200 with a null payload instead of a 404. Tests must drive the action
// through the real wire shape; otherwise a regression that removes the
// wrapper would slip past every assertion below.
const VALID_RESPONSE = {
	subscription: {
		id: '01929e55-9b1a-7c32-8ae0-fedcba987654',
		plan: VALID_PLAN,
		status: 'active',
		currentPeriodEnd: '2026-05-01T00:00:00.000Z',
		cancelledAt: null,
	},
};

describe('getMySubscription', () => {
	test('hits /me/subscription on the authenticated client', async () => {
		// Regression guard for the path-mismatch bug that left the post-Stripe
		// "setting up your membership" dialog spinning forever. Backend exposes
		// `/api/v1/me/subscription`; the FE used to call `/api/v1/subscriptions/me`,
		// which 404'd and folded into a phantom no-subscription state. A typed
		// mock would not have caught this — only an explicit path assertion does.
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await getMySubscription();

		expect(mockGet).toHaveBeenCalledWith(
			'/me/subscription',
			expect.objectContaining({ timeout: expect.any(Number) }),
		);
	});

	test('returns the embedded plan on active subscription', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMySubscription();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toBeNull();
			expect(result.data?.plan.name).toBe('Pro');
			expect(result.data?.status).toBe('active');
			expect(result.data?.cancelledAt).toBeNull();
		}
	});

	test('returns success(null) when backend reports no subscription', async () => {
		// Backend returns 200 with `{ subscription: null }` for users who
		// never subscribed or whose subscription has fully expired. Treated
		// as a valid "empty" state, not an error, so the pricing page and
		// nav badge can branch on `data === null` without threading a
		// specific error code through the UI.
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ subscription: null }),
		);

		const result = await getMySubscription();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBeNull();
		}
	});

	test('does not capture the empty state to Sentry', async () => {
		// Regression guard — the empty `{ subscription: null }` path is the
		// common "no subscription" response for every guest-like session;
		// spamming Sentry with it would bury real issues and burn quota.
		mockCaptureServiceError.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ subscription: null }),
		);

		await getMySubscription();

		expect(mockCaptureServiceError).not.toHaveBeenCalled();
	});

	test('returns FETCH_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				// Missing `plan` field inside the wrapper — Zod parse fails.
				subscription: {
					id: VALID_RESPONSE.subscription.id,
					status: 'active',
					currentPeriodEnd: '2026-05-01T00:00:00.000Z',
					cancelledAt: null,
				},
			}),
		);

		const result = await getMySubscription();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
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

		const result = await getMySubscription();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('global:auth:unauthenticated');
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getMySubscription();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});

	test('maps network error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getMySubscription();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('network_error');
		}
	});
});
