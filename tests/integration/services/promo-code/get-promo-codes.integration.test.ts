import { describe, expect, mock, test } from 'bun:test';

import { PROMO_CODE_ERROR_CODES } from '@/types/errors/promo-code-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

/** Minimal valid list promo codes response */
const VALID_RESPONSE = {
	items: [
		{
			id: 'promo-1',
			code: 'AB23-CD45',
			raffleId: 'raffle-1',
			bulkId: null,
			type: 'free_tickets',
			value: '3',
			maxUses: 10,
			maxRedemptionsPerUser: 1,
			usedCount: 2,
			isActive: true,
			expiresAt: null,
			createdAt: '2026-01-01T00:00:00Z',
		},
	],
	limit: 10,
	offset: 0,
	total: 1,
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock(), delete: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getPromoCodes } = await import(
	'@/services/promo-code/get-promo-codes'
);

describe('getPromoCodes', () => {
	test('returns validated promo codes on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getPromoCodes('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0].code).toBe('AB23-CD45');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ items: 'bad' }));

		const result = await getPromoCodes('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 403 to forbidden', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

		const result = await getPromoCodes('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getPromoCodes('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
