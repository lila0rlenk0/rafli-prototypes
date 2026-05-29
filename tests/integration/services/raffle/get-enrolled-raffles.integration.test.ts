import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { Raffle } from '@/types/raffle';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const VALID_ENROLLED_RAFFLE: Raffle & { myTicketCount: number } = {
	id: 'raffle-1',
	title: 'Enrolled Raffle',
	description: 'A raffle the user enrolled in',
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
	publicSlugOrCode: 'enrolled-raffle',
	participantsCount: 50,
	ticketsSoldCount: 100,
	revenueAmount: '500.00',
	hostId: 'host-1',
	questionId: null,
	cryptoOptions: null,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-15T00:00:00Z',
	myTicketCount: 3,
};

const VALID_LIST_RESPONSE = {
	raffles: [VALID_ENROLLED_RAFFLE],
	total: 1,
	page: 1,
	limit: 10,
	totalPages: 1,
};

// --- Mocks ---

const mockGetSession = mock();
const mockGet = mock();

// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mockGetSession,
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	cachedBaseClient: { get: mockGet, post: mock() },
	authenticatedClient: { get: mock(), post: mock() },
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

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

// Import AFTER mocking
const { getEnrolledRaffles } = await import(
	'@/services/raffle/get-enrolled-raffles'
);

// Stub session — used across all tests; individual tests override when needed.
function stubSession() {
	mockGetSession.mockResolvedValue({
		user: { id: 'user-1', email: 'user@example.com' },
		token: 'test-jwt-token',
		expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
	});
}

describe('getEnrolledRaffles', () => {
	describe('success', () => {
		test('returns paginated enrolled raffles with ticket count', async () => {
			stubSession();
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_LIST_RESPONSE),
			);

			const result = await getEnrolledRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(1);
				expect(result.data.raffles[0].myTicketCount).toBe(3);
				expect(result.data.total).toBe(1);
			}
		});

		test('returns empty list when user has no enrollments', async () => {
			stubSession();
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({
					raffles: [],
					total: 0,
					page: 1,
					limit: 10,
					totalPages: 0,
				}),
			);

			const result = await getEnrolledRaffles();

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.raffles).toHaveLength(0);
			}
		});

		test('passes status filter via URLSearchParams', async () => {
			stubSession();
			mockGet.mockReset();
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse(VALID_LIST_RESPONSE),
			);

			await getEnrolledRaffles({ status: 'live' });

			// buildQueryParamsWithStatus returns URLSearchParams — verify the call was made
			const callArgs = mockGet.mock.calls[0];
			expect(callArgs[0]).toBe('/me/enrolled-raffles');
			const params = callArgs[1].params as URLSearchParams;
			expect(params.get('status')).toBe('live');
		});
	});

	describe('zod validation failure', () => {
		test('returns VALIDATION_ERROR on invalid response shape', async () => {
			stubSession();
			mockGet.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const result = await getEnrolledRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			stubSession();
			mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await getEnrolledRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			stubSession();
			mockGet.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await getEnrolledRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			stubSession();
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await getEnrolledRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			stubSession();
			mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await getEnrolledRaffles();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
