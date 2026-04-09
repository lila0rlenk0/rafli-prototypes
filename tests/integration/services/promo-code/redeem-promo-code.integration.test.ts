import { describe, expect, mock, test } from 'bun:test';

import { PROMO_CODE_ERROR_CODES } from '@/types/errors/promo-code-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '../../../helpers/mock-events';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost, delete: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All event exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: () => null,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/run-after', () => ({
	runAfter: (fn: () => void) => void fn(),
}));

const { redeemPromoCode } = await import(
	'@/services/promo-code/redeem-promo-code'
);

describe('redeemPromoCode', () => {
	test('returns validated response for free_tickets redemption', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				redemptionId: 'redeem-1',
				type: 'free_tickets',
				ticketsGranted: 3,
			}),
		);

		const result = await redeemPromoCode({
			code: 'AB23-CD45',
			raffleId: '550e8400-e29b-41d4-a716-446655440000',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.redemptionId).toBe('redeem-1');
			expect(result.data.ticketsGranted).toBe(3);
		}
	});

	test('returns FETCH_FAILED on invalid payload format', async () => {
		// Invalid UUID for raffleId — safeParse fails before API call
		const result = await redeemPromoCode({
			code: 'AB23-CD45',
			raffleId: 'not-a-uuid',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await redeemPromoCode({
			code: 'AB23-CD45',
			raffleId: '550e8400-e29b-41d4-a716-446655440000',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps already-redeemed from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: { type: 'urn:raffles:problem:core:promo:already-redeemed' },
			}),
		);

		const result = await redeemPromoCode({
			code: 'AB23-CD45',
			raffleId: '550e8400-e29b-41d4-a716-446655440000',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.ALREADY_REDEEMED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await redeemPromoCode({
			code: 'AB23-CD45',
			raffleId: '550e8400-e29b-41d4-a716-446655440000',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
