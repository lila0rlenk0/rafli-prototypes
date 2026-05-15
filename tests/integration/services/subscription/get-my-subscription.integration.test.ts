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
	// `availableProviders` mirrors the BE plans-query derivation; embedded
	// here too because `/me/subscription` re-uses the same plan DTO.
	availableProviders: ['stripe', 'fanbasis'],
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
// entity sits inside a `subscription` wrapper alongside `capabilities` and
// `lockedProvider`, so the no-sub state can be a 200 with null payloads
// instead of a 404 and the FE has the gate matrix it needs to pick between
// the Stripe portal and the in-app cancel dialog. Tests must drive the
// action through the real wire shape; otherwise a regression that drops a
// wrapper field would slip past every assertion below.
//
// Provider information lives on the envelope (`lockedProvider`) and the
// `capabilities` matrix, never on the embedded entity — the unified
// subscription REST surface stopped emitting `subscription.provider`. The
// fixture below stays Stripe-flavoured (full self-serve capabilities,
// `lockedProvider: 'stripe'`) to mirror the original scenario.
const VALID_RESPONSE = {
	subscription: {
		id: '01929e55-9b1a-7c32-8ae0-fedcba987654',
		plan: VALID_PLAN,
		status: 'active',
		currentPeriodEnd: '2026-05-01T00:00:00.000Z',
		cancelledAt: null,
	},
	capabilities: {
		canCancel: true,
		canChangePlan: true,
		canUpdatePaymentMethod: true,
		hasSelfServePortal: true,
		// Stripe-only capabilities — `canScheduleDowngrade` is the BE-side
		// gate for the "Switch at renewal" CTA, and
		// `canCancelScheduledChange` flips true only when a pending change is
		// queued. Both are wire-required since the profile management surface
		// reads them directly; missing them would fail Zod parsing.
		canScheduleDowngrade: true,
		canCancelScheduledChange: false,
	},
	lockedProvider: 'stripe',
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

	test('returns the embedded plan and capabilities on active subscription', async () => {
		// Wrapper threads through end-to-end: consumers read
		// `data.subscription` for the entity and `data.capabilities` for the
		// management-UI gate matrix, so the assertions cover both lanes.
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMySubscription();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subscription).not.toBeNull();
			expect(result.data.subscription?.plan.name).toBe('Pro');
			expect(result.data.subscription?.status).toBe('active');
			expect(result.data.subscription?.cancelledAt).toBeNull();
			expect(result.data.capabilities?.hasSelfServePortal).toBe(true);
			expect(result.data.lockedProvider).toBe('stripe');
		}
	});

	test('returns null subscription / null capabilities when backend reports no history', async () => {
		// Backend returns 200 with `{ subscription: null, capabilities: null,
		// lockedProvider: null }` for users who never subscribed or whose
		// subscription has fully expired AND who have no prior history.
		// Treated as a valid "empty" state, not an error, so the pricing page
		// and nav badge can branch on `data.subscription === null` without
		// threading a specific error code through the UI.
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				subscription: null,
				capabilities: null,
				lockedProvider: null,
			}),
		);

		const result = await getMySubscription();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subscription).toBeNull();
			expect(result.data.capabilities).toBeNull();
			expect(result.data.lockedProvider).toBeNull();
		}
	});

	test('does not capture the empty state to Sentry', async () => {
		// Regression guard — the empty `{ subscription: null, capabilities:
		// null, lockedProvider: null }` path is the common "no subscription"
		// response for every guest-like session; spamming Sentry with it
		// would bury real issues and burn quota.
		mockCaptureServiceError.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				subscription: null,
				capabilities: null,
				lockedProvider: null,
			}),
		);

		await getMySubscription();

		expect(mockCaptureServiceError).not.toHaveBeenCalled();
	});

	test('returns FETCH_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				// Missing `plan` field inside the embedded subscription — Zod
				// parse fails on the inner shape, not on the wrapper. Wrapper
				// fields (`capabilities`, `lockedProvider`) are present so we
				// isolate the drift to the entity layer.
				subscription: {
					id: VALID_RESPONSE.subscription.id,
					status: 'active',
					currentPeriodEnd: '2026-05-01T00:00:00.000Z',
					cancelledAt: null,
				},
				capabilities: VALID_RESPONSE.capabilities,
				lockedProvider: 'stripe',
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
