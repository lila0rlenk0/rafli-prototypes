import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { Raffle } from '@/types/raffle';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

/**
 * Minimal valid raffle matching raffleSchema
 */
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

// Mock the API client module before importing the server action
const mockGet = mock();
const mockAuthenticatedGet = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock() },
	cachedBaseClient: { get: mockGet },
	authenticatedClient: { get: mockAuthenticatedGet, post: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// `'use cache'` and `cacheLife` / `cacheTag` are no-ops outside the Next runtime.
// Mock the full module so the cached path is exercisable in plain Bun tests.
mock.module('next/cache', () => ({
	cacheLife: mock(),
	cacheTag: mock(),
	revalidateTag: mock(),
	revalidatePath: mock(),
}));

// Import AFTER mocking
const { getRaffle } = await import('@/services/raffle/get-raffle');

describe('getRaffle', () => {
	describe('success', () => {
		test('returns validated raffle on valid response', async () => {
			mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RAFFLE));

			const result = await getRaffle('test-raffle');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('raffle-1');
				expect(result.data.title).toBe('Test Raffle');
				expect(result.data.status).toBe('live');
			}
		});

		test('uses authenticated client when caller opts in via { authed: true }', async () => {
			// `getRaffle` no longer reads cookies — the caller decides which client
			// to use. `{ authed: true }` enriches the response with user-scoped
			// fields (e.g. xShareClaim) and bypasses the public `'use cache'` path.
			mockGet.mockClear();
			mockAuthenticatedGet.mockResolvedValueOnce(
				mockAxiosResponse({
					...VALID_RAFFLE,
					xShareClaim: {
						claimId: 'claim-1',
						status: 'pending',
						token: 'xref-token',
						expiresAt: '2026-01-01T01:00:00Z',
					},
				}),
			);

			const result = await getRaffle('test-raffle', { authed: true });

			expect(result.success).toBe(true);
			expect(mockAuthenticatedGet).toHaveBeenCalledWith('/raffles/test-raffle');
			expect(mockGet).not.toHaveBeenCalled();
			if (result.success) {
				expect(result.data.xShareClaim?.status).toBe('pending');
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await getRaffle('test-raffle');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
			// captureContractDrift is called but Sentry is a no-op without DSN in tests
		});
	});

	describe('backend RFC 7807 error', () => {
		test('maps core:raffle:not-found from URN type', async () => {
			mockGet.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: { type: 'urn:raffles:problem:core:raffle:not-found' },
				}),
			);

			const result = await getRaffle('nonexistent');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.NOT_FOUND);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getRaffle('test-raffle');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ECONNABORTED' }));

			const result = await getRaffle('test-raffle');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 500 to internal_server_error', async () => {
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getRaffle('test-raffle');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
