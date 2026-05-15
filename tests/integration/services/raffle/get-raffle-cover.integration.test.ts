import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const VALID_COVER_RESPONSE = {
	raffleId: 'raffle-1',
	cover: 'https://cdn.example.com/covers/raffle-1.jpg',
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
const { getRaffleCover } = await import(
	'@/services/raffle/get-raffle-cover'
);

describe('getRaffleCover', () => {
	describe('success', () => {
		test('returns cover URL on valid response', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_COVER_RESPONSE),
			);

			const result = await getRaffleCover('raffle-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffleId).toBe('raffle-1');
				expect(result.data.cover).toBe(
					'https://cdn.example.com/covers/raffle-1.jpg',
				);
			}
		});

		test('returns null cover when raffle has no cover', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ raffleId: 'raffle-1', cover: null }),
			);

			const result = await getRaffleCover('raffle-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.cover).toBeNull();
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await getRaffleCover('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getRaffleCover('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getRaffleCover('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getRaffleCover('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
