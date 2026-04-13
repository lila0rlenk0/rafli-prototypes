import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { ORDER_ERROR_CODES } from '@/types/errors/order-errors';
import type { Order } from '@/types/order';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

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

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mockGet, post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getOrder } = await import('@/services/order/get-order');

describe('getOrder', () => {
	describe('success', () => {
		test('returns validated order on valid response', async () => {
			mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_ORDER));

			const result = await getOrder(
				'22222222-2222-7222-8222-222222222222',
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('22222222-2222-7222-8222-222222222222');
				expect(result.data.ticketQuantity).toBe(2);
				expect(result.data.status).toBe('pending');
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await getOrder('order-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('backend RFC 7807 error', () => {
		test('maps core:order:not-found from URN type', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: { type: 'urn:raffles:problem:core:order:not-found' },
				}),
			);

			const result = await getOrder('nonexistent');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(ORDER_ERROR_CODES.NOT_FOUND);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getOrder('order-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getOrder('order-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await getOrder('order-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 403 to forbidden', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

			const result = await getOrder('order-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getOrder('order-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
