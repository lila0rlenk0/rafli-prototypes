import { describe, expect, mock, test } from 'bun:test';

import { SUBSCRIPTION_ERROR_CODES } from '@/types/errors/subscription-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();
const mockCaptureContractDrift = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mockGet },
	authenticatedClient: { get: mock(), post: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mockCaptureContractDrift,
	captureServiceError: mockCaptureServiceError,
}));

const { getPlans } = await import('@/services/subscription/get-plans');

// UUIDv7 prefix `01` so z.uuidv7() accepts it — regular UUIDv4 fails the variant check.
const VALID_PLAN = {
	id: '01929e55-9b1a-7c32-8ae0-0123456789ab',
	name: 'Starter',
	monthlyPriceAmount: '25.0000',
	creditAmount: '25.0000',
	discountPercent: 15,
	// `availableProviders` mirrors the BE plans-query derivation — non-empty
	// list of rails the plan is subscribable on. Schema rejects empty arrays.
	availableProviders: ['stripe', 'fanbasis'],
	metadata: {
		badgeText: '15% OFF',
		highlightLabel: null,
		isHighlighted: false,
		sortOrder: 1,
		tagline: '25 credits/month, 15% discount',
		features: [
			{ text: '25 credits every month', tag: null },
			{ text: '15% off all tickets', tag: 'LIMITED OFFER' },
		],
	},
};

const VALID_RESPONSE = { plans: [VALID_PLAN] };

describe('getPlans', () => {
	test('returns validated plans on 200', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getPlans();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.plans).toHaveLength(1);
			expect(result.data.plans[0]?.name).toBe('Starter');
			expect(result.data.plans[0]?.metadata.features[1]?.tag).toBe(
				'LIMITED OFFER',
			);
		}
	});

	test('returns FETCH_FAILED and captures contract drift on invalid response', async () => {
		mockCaptureContractDrift.mockReset();
		// metadata.features missing the required `tag` field → Zod parse fails.
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				plans: [
					{
						...VALID_PLAN,
						metadata: {
							...VALID_PLAN.metadata,
							features: [{ text: 'no tag' }],
						},
					},
				],
			}),
		);

		const result = await getPlans();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}
		expect(mockCaptureContractDrift).toHaveBeenCalledTimes(1);
	});

	test('maps plan-not-found from RFC 7807 response', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:payments:subscription:plan-not-found' },
			}),
		);

		const result = await getPlans();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND);
		}
	});

	test('maps network error to timeout_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await getPlans();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('timeout_error');
		}
	});

	test('captures service error on HTTP 500', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getPlans();

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalledTimes(1);
	});
});
