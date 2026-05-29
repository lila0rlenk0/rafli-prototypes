import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { Raffle } from '@/types/raffle';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const VALID_RAFFLE: Raffle = {
	id: 'raffle-1',
	title: 'Test Raffle',
	description: 'A test raffle description',
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
	minTickets: 0,
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
};

const VALID_LIST_RESPONSE = {
	raffles: [VALID_RAFFLE],
	total: 1,
	page: 1,
	limit: 10,
	totalPages: 1,
};

// --- Mocks ---

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock() },
	cachedBaseClient: { get: mockGet },
	authenticatedClient: { get: mock(), post: mock() },
}));
mock.module('next/cache', () => ({
	cacheLife: mock(),
	cacheTag: mock(),
	revalidateTag: mock(),
	revalidatePath: mock(),
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getRaffles } = await import('@/services/raffle/get-raffles');

describe('getRaffles', () => {
	describe('success', () => {
		test('returns paginated raffles on valid response', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_LIST_RESPONSE),
			);

			const result = await getRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(1);
				expect(result.data.total).toBe(1);
				expect(result.data.page).toBe(1);
			}
		});

		test('returns empty list when no raffles exist', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({
					raffles: [],
					total: 0,
					page: 1,
					limit: 10,
					totalPages: 0,
				}),
			);

			const result = await getRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(0);
				expect(result.data.total).toBe(0);
			}
		});

		test('passes query params to API as strings', async () => {
			mockGet.mockReset();
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_LIST_RESPONSE),
			);

			await getRaffles({ page: 2, limit: 20 });

			// buildQueryParams converts numbers to strings
			expect(mockGet).toHaveBeenCalledWith(
				'/raffles',
				expect.objectContaining({
					params: expect.objectContaining({ page: '2', limit: '20' }),
				}),
			);
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await getRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
