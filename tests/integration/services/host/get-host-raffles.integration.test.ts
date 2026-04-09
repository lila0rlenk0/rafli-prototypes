import { describe, expect, mock, test } from 'bun:test';

import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

/** Minimal valid list raffles response matching listRafflesResponseSchema */
const VALID_RESPONSE = {
	raffles: [
		{
			id: 'raffle-1',
			title: 'Test Raffle',
			description: 'Desc',
			categoryId: 'cat-1',
			coverMediaUrl: null,
			galleryMediaUrls: [],
			declaredValueAmount: '100.00',
			declaredValueCurrency: 'USD',
			ticketPriceAmount: '5.00',
			ticketPriceCurrency: 'USD',
			startAt: '2026-01-01T00:00:00Z',
			endAt: '2026-02-01T00:00:00Z',
			timezone: 'America/New_York',
			numberOfWinners: 1,
			minParticipants: 10,
			maxParticipants: 1_000,
			deliveryIncluded: false,
			status: 'live',
			publicSlugOrCode: 'test-raffle',
			participantsCount: 50,
			ticketsSoldCount: 100,
			revenueAmount: '500.00',
			hostId: 'host-1',
			questionId: null,
			cryptoOptions: null,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-15T00:00:00Z',
		},
	],
	limit: 10,
	page: 1,
	total: 1,
	totalPages: 1,
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

const { getHostRaffles } = await import('@/services/host/get-host-raffles');

describe('getHostRaffles', () => {
	test('returns validated raffle list on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getHostRaffles({ hostId: 'host-1' });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.raffles).toHaveLength(1);
			expect(result.data.raffles[0].title).toBe('Test Raffle');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ raffles: 'bad' }));

		const result = await getHostRaffles({ hostId: 'host-1' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getHostRaffles({ hostId: 'host-1' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getHostRaffles({ hostId: 'host-1' });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
