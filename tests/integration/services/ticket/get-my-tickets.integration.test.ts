import { describe, expect, mock, test } from 'bun:test';

import { TICKET_ERROR_CODES } from '@/types/errors/ticket-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { TicketsResponse } from '@/types/ticket';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE: TicketsResponse = {
	balances: [
		{
			raffleId: 'raffle-1',
			totalTickets: 5,
			entries: [],
		},
	],
	totalRaffles: 1,
	limit: 10,
	page: 1,
	total: 1,
	totalPages: 1,
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getMyTickets } = await import('@/services/ticket/get-my-tickets');

describe('getMyTickets', () => {
	test('returns validated ticket balances on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMyTickets();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.balances).toHaveLength(1);
			expect(result.data.balances[0].totalTickets).toBe(5);
			expect(result.data.totalRaffles).toBe(1);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ balances: 'bad' }));

		const result = await getMyTickets();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(TICKET_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getMyTickets();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getMyTickets();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
