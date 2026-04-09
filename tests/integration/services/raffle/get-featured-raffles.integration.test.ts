import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { Raffle } from '@/types/raffle';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_RAFFLE: Raffle = {
	id: 'raffle-1',
	title: 'Featured Raffle',
	description: 'A featured raffle description',
	categoryId: 'cat-1',
	coverMediaUrl: 'https://example.com/cover.jpg',
	galleryMediaUrls: [],
	declaredValueAmount: '500.00',
	declaredValueCurrency: 'USD',
	ticketPriceAmount: '10.00',
	ticketPriceCurrency: 'USD',
	startAt: '2026-01-01T00:00:00Z',
	endAt: '2026-02-01T00:00:00Z',
	timezone: 'America/New_York',
	numberOfWinners: 1,
	minParticipants: 10,
	maxParticipants: 1_000,
	deliveryIncluded: false,
	status: 'live',
	publicSlugOrCode: 'featured-raffle',
	participantsCount: 200,
	ticketsSoldCount: 500,
	revenueAmount: '5000.00',
	hostId: 'host-1',
	questionId: null,
	cryptoOptions: null,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-15T00:00:00Z',
};

// --- Mocks ---

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mockGet },
	authenticatedClient: { get: mock(), post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getFeaturedRaffles } = await import(
	'@/services/raffle/get-featured-raffles'
);

describe('getFeaturedRaffles', () => {
	describe('success', () => {
		test('returns featured raffles on valid response', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ raffles: [VALID_RAFFLE] }),
			);

			const result = await getFeaturedRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(1);
				expect(result.data.raffles[0].title).toBe('Featured Raffle');
			}
		});

		test('returns empty array when no featured raffles', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ raffles: [] }),
			);

			const result = await getFeaturedRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(0);
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await getFeaturedRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getFeaturedRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getFeaturedRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getFeaturedRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
