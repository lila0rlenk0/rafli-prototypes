import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPatch = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();
const mockTrackAfter = mock();
const mockRevalidateMySubscription = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: {
		get: mock(),
		post: mock(),
		patch: mockPatch,
		delete: mock(),
	},
	baseClient: { get: mock() },
}));

mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => Promise.resolve({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mockTrackAfter,
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

mock.module('@/lib/cache/revalidation', () => ({
	revalidateMySubscription: mockRevalidateMySubscription,
	revalidateMyRaffles: mock(),
	revalidateRaffleDetail: mock(),
	revalidateWinningPaths: mock(),
}));

mock.module('@/lib/utils/run-after', () => ({
	runAfter: (task: () => void | Promise<void>) => void task(),
}));

mock.module('@/env/server', () => ({
	env: { APP_URL: 'https://raffly.test' },
}));

const { changePlan } = await import('@/services/subscription/change-plan');

const VALID_SUBSCRIPTION_ID = '01929e55-9b1a-7c32-8ae0-0123456789ab';
const VALID_NEW_PLAN_ID = '01929e55-9b1a-7c32-8ae0-deadbeefcafe';
const VALID_NOW_PAYLOAD = {
	subscriptionId: VALID_SUBSCRIPTION_ID,
	newPlanId: VALID_NEW_PLAN_ID,
	effective: 'now' as const,
};
const VALID_PERIOD_END_PAYLOAD = {
	subscriptionId: VALID_SUBSCRIPTION_ID,
	newPlanId: VALID_NEW_PLAN_ID,
	effective: 'period_end' as const,
};

const IN_PLACE_RESPONSE = {
	kind: 'in-place' as const,
	planId: VALID_NEW_PLAN_ID,
	planName: 'Pro',
	status: 'active' as const,
	checkoutUrl: null,
};
const SCHEDULED_RESPONSE = {
	kind: 'scheduled' as const,
	planId: VALID_NEW_PLAN_ID,
	planName: 'Starter',
	effectiveAt: '2026-06-01T00:00:00.000Z',
	status: 'active' as const,
	checkoutUrl: null,
};
const REDIRECT_RESPONSE = {
	kind: 'redirect' as const,
	checkoutUrl: 'https://app.fanbasis.com/checkout/xyz',
	planId: null,
	planName: null,
	status: null,
};

describe('changePlan', () => {
	test('returns in-place payload on Stripe immediate-swap success', async () => {
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(IN_PLACE_RESPONSE));

		const result = await changePlan(VALID_NOW_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.kind).toBe('in-place');
			expect(result.data.planId).toBe(VALID_NEW_PLAN_ID);
			expect(result.data.planName).toBe('Pro');
			expect(result.data.checkoutUrl).toBeNull();
		}
	});

	test('returns scheduled payload on Stripe period-end success', async () => {
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(SCHEDULED_RESPONSE));

		const result = await changePlan(VALID_PERIOD_END_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success && result.data.kind === 'scheduled') {
			expect(result.data.effectiveAt).toBe(SCHEDULED_RESPONSE.effectiveAt);
		}
	});

	test('returns redirect payload on Fanbasis cancel-and-recreate', async () => {
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(REDIRECT_RESPONSE));

		const result = await changePlan(VALID_NOW_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success && result.data.kind === 'redirect') {
			expect(result.data.checkoutUrl).toBe(REDIRECT_RESPONSE.checkoutUrl);
			expect(result.data.planId).toBeNull();
		}
	});

	test('sends PATCH /subscriptions/:id with newPlanId + effective + urls; no provider field', async () => {
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(IN_PLACE_RESPONSE));

		await changePlan(VALID_NOW_PAYLOAD);

		const lastCall = mockPatch.mock.calls[mockPatch.mock.calls.length - 1];
		const [path, body] = lastCall ?? [];
		expect(path).toBe(`/subscriptions/${VALID_SUBSCRIPTION_ID}`);
		expect(body).toMatchObject({
			newPlanId: VALID_NEW_PLAN_ID,
			effective: 'now',
			successUrl: expect.stringContaining('/profile'),
			cancelUrl: expect.stringContaining('/profile'),
		});
		// Critical contract — the FE must NEVER send a provider field on this
		// surface. Backend auto-detects from the existing subscription row.
		expect(body).not.toHaveProperty('provider');
	});

	test('invokes revalidateMySubscription on in-place + scheduled but not redirect', async () => {
		mockRevalidateMySubscription.mockReset();
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(IN_PLACE_RESPONSE));
		await changePlan(VALID_NOW_PAYLOAD);
		expect(mockRevalidateMySubscription).toHaveBeenCalledTimes(1);

		mockRevalidateMySubscription.mockReset();
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(SCHEDULED_RESPONSE));
		await changePlan(VALID_PERIOD_END_PAYLOAD);
		expect(mockRevalidateMySubscription).toHaveBeenCalledTimes(1);

		mockRevalidateMySubscription.mockReset();
		mockPatch.mockResolvedValueOnce(mockAxiosResponse(REDIRECT_RESPONSE));
		await changePlan(VALID_NOW_PAYLOAD);
		// Redirect = not durable yet; revalidate fires on the post-checkout
		// webhook path, not here.
		expect(mockRevalidateMySubscription).not.toHaveBeenCalled();
	});

	test('returns VALIDATION_ERROR when subscriptionId is not a UUID', async () => {
		// Same rationale as `cancel-scheduled-change`: a malformed UUID is a
		// payload defect, not a missing subscription row. Surfaced as
		// `validation_error` so the dialog falls through to the generic
		// fallback copy rather than the misleading "we couldn't find that
		// subscription" toast.
		mockPatch.mockReset();

		const result = await changePlan({
			subscriptionId: 'not-a-uuid',
			newPlanId: VALID_NEW_PLAN_ID,
			effective: 'now',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		expect(mockPatch).not.toHaveBeenCalled();
	});

	test('returns FETCH_FAILED on response shape drift', async () => {
		mockCaptureContractDrift.mockReset();
		mockPatch.mockResolvedValueOnce(
			mockAxiosResponse({ wrongField: 'unknown' }),
		);

		const result = await changePlan(VALID_NOW_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps plan-not-found from RFC 7807 response', async () => {
		mockPatch.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:subscription:plan-not-found',
				},
			}),
		);

		const result = await changePlan(VALID_NOW_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND);
		}
	});
});
