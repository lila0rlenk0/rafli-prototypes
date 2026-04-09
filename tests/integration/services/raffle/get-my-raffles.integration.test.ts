import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { Raffle } from '@/types/raffle';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_RAFFLE: Raffle = {
	id: 'raffle-1',
	title: 'My Raffle',
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
	deliveryIncluded: false,
	status: 'draft',
	publicSlugOrCode: 'my-raffle',
	participantsCount: 0,
	ticketsSoldCount: 0,
	revenueAmount: '0.00',
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
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mockGet, post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getMyRaffles } = await import('@/services/raffle/get-my-raffles');

describe('getMyRaffles', () => {
	describe('success', () => {
		test('returns paginated raffles on valid response', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_LIST_RESPONSE),
			);

			const result = await getMyRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(1);
				expect(result.data.total).toBe(1);
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

			const result = await getMyRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(0);
			}
		});

		test('passes status filter via URLSearchParams', async () => {
			mockGet.mockReset();
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_LIST_RESPONSE),
			);

			await getMyRaffles({ status: 'draft' });

			// buildQueryParamsWithStatus returns URLSearchParams — verify the call was made
			const callArgs = mockGet.mock.calls[0];
			expect(callArgs[0]).toBe('/me/raffles');
			const params = callArgs[1].params as URLSearchParams;
			expect(params.get('status')).toBe('draft');
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await getMyRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getMyRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getMyRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await getMyRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getMyRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
