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
