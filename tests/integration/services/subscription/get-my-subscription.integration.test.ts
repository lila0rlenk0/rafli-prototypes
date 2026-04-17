import { describe, expect, mock, test } from 'bun:test';

import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

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

const VALID_RESPONSE = {
	id: '01929e55-9b1a-7c32-8ae0-fedcba987654',
	planId: VALID_PLAN.id,
	plan: VALID_PLAN,
	status: 'active',
	currentPeriodEnd: '2026-05-01T00:00:00.000Z',
	cancelledAt: null,
};

describe('getMySubscription', () => {
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

	test('returns success(null) when backend reports not-found', async () => {
		// 404 with `payments:subscription:not-found` — the user simply has no
		// subscription. Treated as a valid "empty" state, not an error, so the
		// pricing page and nav badge can branch on data === null without
		// threading a specific error code through the UI.
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:subscription:not-found',
				},
			}),
		);

		const result = await getMySubscription();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBeNull();
		}
	});

	test('does not capture not-found to Sentry', async () => {
		// Regression guard — not-found is the common "no subscription" path for
		// every guest-like session; spamming Sentry with it would bury real
		// issues and burn quota.
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:payments:subscription:not-found',
				},
			}),
		);

		await getMySubscription();

		expect(mockCaptureServiceError).not.toHaveBeenCalled();
	});

	test('returns FETCH_FAILED and captures contract drift on shape mismatch', async () => {
		mockCaptureContractDrift.mockReset();
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				// Missing `plan` field — Zod parse fails.
				id: VALID_RESPONSE.id,
				planId: VALID_PLAN.id,
				status: 'active',
				currentPeriodEnd: '2026-05-01T00:00:00.000Z',
				cancelledAt: null,
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
