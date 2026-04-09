import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_GALLERY_RESPONSE = {
	raffleId: 'raffle-1',
	gallery: [
		'https://cdn.example.com/gallery/img1.jpg',
		'https://cdn.example.com/gallery/img2.jpg',
	],
	total: 2,
	page: 1,
	limit: 10,
	totalPages: 1,
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
// All next/cache exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('next/cache', () => ({
	cacheLife: mock(),
	cacheTag: mock(),
	unstable_cacheLife: mock(),
	unstable_cacheTag: mock(),
	revalidatePath: mock(),
	revalidateTag: mock(),
}));

// Import AFTER mocking
const { getRaffleGallery } = await import(
	'@/services/raffle/get-raffle-gallery'
);

describe('getRaffleGallery', () => {
	describe('success', () => {
		test('returns gallery images on valid response', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_GALLERY_RESPONSE),
			);

			const result = await getRaffleGallery('raffle-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.gallery).toHaveLength(2);
				expect(result.data.raffleId).toBe('raffle-1');
				expect(result.data.total).toBe(2);
			}
		});

		test('returns empty gallery when no images exist', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({
					raffleId: 'raffle-1',
					gallery: [],
					total: 0,
					page: 1,
					limit: 10,
					totalPages: 0,
				}),
			);

			const result = await getRaffleGallery('raffle-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.gallery).toHaveLength(0);
			}
		});

		test('passes pagination params to API', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_GALLERY_RESPONSE),
			);

			await getRaffleGallery('raffle-1', 3, 2);

			expect(mockGet).toHaveBeenCalledWith(
				'/raffles/raffle-1/gallery',
				expect.objectContaining({
					params: expect.objectContaining({ limit: 3, page: 2 }),
				}),
			);
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await getRaffleGallery('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getRaffleGallery('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getRaffleGallery('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getRaffleGallery('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
