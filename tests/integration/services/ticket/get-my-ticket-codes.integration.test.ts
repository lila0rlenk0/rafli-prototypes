import { describe, expect, mock, test } from 'bun:test';

import { TICKET_ERROR_CODES } from '@/types/errors/ticket-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { TicketCodesResponse } from '@/types/ticket';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE: TicketCodesResponse = {
	tickets: [
		{
			ticketCode: 'TC-001',
			raffleId: 'raffle-1',
			source: 'purchase',
			receiptUrl: 'https://stripe.com/receipt/123',
			createdAt: '2026-01-01T00:00:00Z',
		},
	],
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

const { getMyTicketCodes } = await import(
	'@/services/ticket/get-my-ticket-codes'
);

describe('getMyTicketCodes', () => {
	test('returns validated ticket codes on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMyTicketCodes();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.tickets).toHaveLength(1);
			expect(result.data.tickets[0].ticketCode).toBe('TC-001');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ tickets: 'bad' }));

		const result = await getMyTicketCodes();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(TICKET_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getMyTicketCodes();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getMyTicketCodes();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
