import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { CreateRaffleInput, Raffle } from '@/types/raffle';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const VALID_INPUT: CreateRaffleInput = {
	title: 'Test Raffle',
	description: 'A test raffle for integration testing',
	price: 100,
	category: '11111111-1111-7111-8111-111111111111',
	startDate: '2026-06-01T00:00:00Z',
	endDate: '2026-07-01T00:00:00Z',
	pricePerTicket: 5,
	numberOfWinners: 1,
	minParticipants: 10,
	maxParticipants: 1_000,
	checkInQuestion: '22222222-2222-7222-8222-222222222222',
	timezone: 'America/New_York',
	acceptsCrypto: false,
	cryptoChainIds: [],
	cryptoTokens: [],
	cryptoTokenPricing: [],
};

const VALID_RAFFLE: Raffle = {
	id: 'raffle-1',
	title: 'Test Raffle',
	description: 'A test raffle for integration testing',
	categoryId: '11111111-1111-7111-8111-111111111111',
	coverMediaUrl: null,
	galleryMediaUrls: [],
	declaredValueAmount: '100.00',
	declaredValueCurrency: 'USD',
	ticketPriceAmount: '5.00',
	ticketPriceCurrency: 'USD',
	startAt: '2026-06-01T00:00:00Z',
	endAt: '2026-07-01T00:00:00Z',
	timezone: 'America/New_York',
	numberOfWinners: 1,
	minParticipants: 10,
	maxParticipants: 1_000,
	deliveryIncluded: false,
	status: 'draft',
	publicSlugOrCode: 'test-raffle',
	participantsCount: 0,
	ticketsSoldCount: 0,
	revenueAmount: '0.00',
	hostId: 'host-1',
	questionId: '22222222-2222-7222-8222-222222222222',
	cryptoOptions: null,
	createdAt: '2026-06-01T00:00:00Z',
	updatedAt: '2026-06-01T00:00:00Z',
};

// --- Mocks ---

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => ({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
	trackAfter: mock(),
}));
mock.module('@/lib/utils/run-after', () => ({
	runAfter: mock(),
}));

// Import AFTER mocking
const { createRaffle } = await import('@/services/raffle/create-raffle');

describe('createRaffle', () => {
	describe('success', () => {
		test('returns validated raffle on valid input', async () => {
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RAFFLE));

			const result = await createRaffle(VALID_INPUT);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('raffle-1');
				expect(result.data.title).toBe('Test Raffle');
				expect(result.data.status).toBe('draft');
			}
		});
	});

	describe('input validation failure', () => {
		test('returns FETCH_FAILED when payload fails safeParse', async () => {
			// Invalid input — category is not a UUID, will fail createRafflePayloadSchema
			const invalidInput = {
				...VALID_INPUT,
				category: 'not-a-uuid',
			};

			const result = await createRaffle(invalidInput);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await createRaffle(VALID_INPUT);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('backend RFC 7807 error', () => {
		test('maps core:raffle:invalid-dates from URN type', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 400,
					data: {
						type: 'urn:raffles:problem:core:raffle:invalid-dates',
					},
				}),
			);

			const result = await createRaffle(VALID_INPUT);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.INVALID_DATES);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await createRaffle(VALID_INPUT);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await createRaffle(VALID_INPUT);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await createRaffle(VALID_INPUT);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await createRaffle(VALID_INPUT);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
