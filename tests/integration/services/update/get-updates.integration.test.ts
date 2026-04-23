import { describe, expect, mock, test } from 'bun:test';

import { UPDATE_ERROR_CODES } from '@/types/errors/update-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { ListUpdatesResponse } from '@/types/update';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const VALID_RESPONSE: ListUpdatesResponse = {
	items: [
		{
			id: 'update-1',
			raffleId: 'raffle-1',
			text: 'Update text',
			imageUrls: ['https://example.com/img.png'],
			host: { id: 'host-1', name: 'Host', avatar: null },
			createdAt: '2026-01-01T00:00:00Z',
		},
	],
	limit: 10,
	offset: 0,
	total: 1,
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mockGet },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getUpdates } = await import('@/services/update/get-updates');

describe('getUpdates', () => {
	test('returns validated updates on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getUpdates('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.total).toBe(1);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ items: 'bad' }));

		const result = await getUpdates('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(UPDATE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps ECONNABORTED to timeout_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

		const result = await getUpdates('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getUpdates('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
