import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { ORDER_ERROR_CODES } from '@/types/errors/order-errors';
import type { CreateOrderPayload, Order } from '@/types/order';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_PAYLOAD: CreateOrderPayload = {
	raffleId: '11111111-1111-7111-8111-111111111111',
	ticketQuantity: 2,
	promoCode: undefined,
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

// Import AFTER mocking
const { createOrder } = await import('@/services/order/create-order');

describe('createOrder', () => {
	describe('success', () => {
		test('returns validated order on valid payload', async () => {
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_ORDER));

			const result = await createOrder(VALID_PAYLOAD);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('22222222-2222-7222-8222-222222222222');
				expect(result.data.ticketQuantity).toBe(2);
				expect(result.data.status).toBe('pending');
			}
		});

		test('returns order with promo code applied', async () => {
			const orderWithPromo = { ...VALID_ORDER, promoCode: 'SAVE10' };
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(orderWithPromo),
			);

			const result = await createOrder({
				...VALID_PAYLOAD,
				promoCode: 'SAVE10',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.promoCode).toBe('SAVE10');
			}
		});
	});

	describe('input validation failure', () => {
		test('returns INVALID_QUANTITY when ticketQuantity is 0', async () => {
			const result = await createOrder({
				...VALID_PAYLOAD,
				ticketQuantity: 0,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.INVALID_QUANTITY);
			}
		});

		test('returns INVALID_QUANTITY when raffleId is not UUID', async () => {
			const result = await createOrder({
				...VALID_PAYLOAD,
				raffleId: 'not-a-uuid' as `${string}-${string}-${string}-${string}-${string}`,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.INVALID_QUANTITY);
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await createOrder(VALID_PAYLOAD);

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

			const result = await createOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.SOLD_OUT);
			}
		});

		test('maps core:raffle:not-active from URN type', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 400,
					data: { type: 'urn:raffles:problem:core:raffle:not-active' },
				}),
			);

			const result = await createOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.NOT_ACTIVE);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await createOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await createOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await createOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await createOrder(VALID_PAYLOAD);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
