import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { ORDER_ERROR_CODES } from '@/types/errors/order-errors';
import type { Order } from '@/types/order';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '../../../helpers/mock-events';

// --- Fixtures ---

const VALID_PAYLOAD = {
	raffleId: '11111111-1111-7111-8111-111111111111' as const,
	ticketQuantity: 2,
};

const VALID_ORDER: Order = {
	id: '22222222-2222-7222-8222-222222222222',
	raffleId: '11111111-1111-7111-8111-111111111111',
	userId: 'user-1',
	ticketQuantity: 2,
	unitPrice: '5.0000',
	totalAmount: '10.0000',
	currency: 'USD',
	promoCode: null,
	status: 'pending',
	createdAt: '2026-03-13T12:00:00.000Z',
	updatedAt: '2026-03-13T12:00:00.000Z',
	raffleName: 'Test Raffle',
};

/** Order where promo covers entire cost — totalAmount is zero */
const FULLY_DISCOUNTED_ORDER: Order = {
	...VALID_ORDER,
	totalAmount: '0.0000',
	promoCode: 'FREE100',
	status: 'completed',
};

// --- Mocks ---

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => ({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
}));
mock.module('@/lib/run-after', () => ({
	runAfter: mock(),
}));
// All event exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);

// Import AFTER mocking
const { checkoutOrder } = await import('@/services/order/checkout-order');

describe('checkoutOrder', () => {
	describe('success', () => {
		test('returns order with isFullyDiscounted false for paid order', async () => {
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_ORDER));

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.order.id).toBe(
					'22222222-2222-7222-8222-222222222222',
				);
				expect(result.data.isFullyDiscounted).toBe(false);
			}
		});

		test('returns isFullyDiscounted true when totalAmount is zero', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(FULLY_DISCOUNTED_ORDER),
			);

			const result = await checkoutOrder({
				...VALID_PAYLOAD,
				promoCode: 'FREE100',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isFullyDiscounted).toBe(true);
				expect(result.data.order.status).toBe('completed');
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('backend RFC 7807 error', () => {
		test('maps core:raffle:sold-out from URN type', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 400,
					data: { type: 'urn:raffles:problem:core:raffle:sold-out' },
				}),
			);

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.SOLD_OUT);
			}
		});

		test('maps core:order:question-not-answered from URN type', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 400,
					data: {
						type: 'urn:raffles:problem:core:order:question-not-answered',
					},
				}),
			);

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.QUESTION_NOT_ANSWERED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await checkoutOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
