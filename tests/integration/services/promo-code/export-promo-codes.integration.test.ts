import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock(), delete: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { exportPromoCodes } = await import(
	'@/services/promo-code/export-promo-codes'
);

describe('exportPromoCodes', () => {
	test('returns CSV string on success', async () => {
		const csv = 'code,type,value\nAB23-CD45,free_tickets,3';
		mockGet.mockResolvedValueOnce(mockAxiosResponse(csv));

		const result = await exportPromoCodes('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toContain('AB23-CD45');
		}
	});

	test('maps 403 to forbidden', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

		const result = await exportPromoCodes('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await exportPromoCodes('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await exportPromoCodes('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
