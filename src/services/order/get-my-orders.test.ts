import { describe, expect, mock, spyOn, test } from 'bun:test';

import { ORDER_ERROR_CODES } from '@/types/errors';

import { mockAxiosResponse } from '../../../tests/helpers/mock-axios';

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet },
	baseClient: { get: mock() },
}));

const { getMyOrders } = await import('./get-my-orders');

describe('getMyOrders', () => {
	test('returns paginated orders on valid backend response', async () => {
		mockGet.mockReset();
		const order = {
			id: '11111111-1111-4111-8111-111111111111',
			raffleId: '22222222-2222-4222-8222-222222222222',
			userId: 'user-1',
			ticketQuantity: 2,
			unitPrice: '10.00',
			totalAmount: '20.00',
			currency: 'USD',
			promoCode: null,
			status: 'pending',
			createdAt: '2026-03-13T12:00:00.000Z',
			updatedAt: '2026-03-13T12:00:00.000Z',
			raffleName: 'Test Raffle',
			raffleSlug: 'test-raffle',
		};
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ total: 1, orders: [order] }),
		);

		const result = await getMyOrders({ page: 1, limit: 10 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.total).toBe(1);
			expect(result.data.page).toBe(1);
			expect(result.data.totalPages).toBe(1);
		}
	});

	test('returns FETCH_FAILED when backend response is null', async () => {
		mockGet.mockReset();
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
		mockGet.mockResolvedValueOnce(mockAxiosResponse(null));

		const result = await getMyOrders({ page: 1, limit: 10 });

		expect(result).toEqual({
			success: false,
			error: ORDER_ERROR_CODES.FETCH_FAILED,
		});
		expect(consoleSpy).toHaveBeenCalledTimes(1);
		consoleSpy.mockRestore();
	});

	test('returns FETCH_FAILED when backend response shape is invalid', async () => {
		mockGet.mockReset();
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ invalid: true }));

		const result = await getMyOrders({ page: 1, limit: 10 });

		expect(result).toEqual({
			success: false,
			error: ORDER_ERROR_CODES.FETCH_FAILED,
		});
		expect(consoleSpy).toHaveBeenCalledTimes(1);
		consoleSpy.mockRestore();
	});
});
