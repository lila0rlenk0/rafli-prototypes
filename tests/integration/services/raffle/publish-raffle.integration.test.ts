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
	deliveryIncluded: false,
	status: 'live',
	publicSlugOrCode: 'test-raffle',
	participantsCount: 0,
	ticketsSoldCount: 0,
	revenueAmount: '0.00',
	hostId: 'host-1',
	questionId: null,
	cryptoOptions: null,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-15T00:00:00Z',
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
const { publishRaffle } = await import('@/services/raffle/publish-raffle');

describe('publishRaffle', () => {
	describe('success', () => {
		test('returns validated raffle on successful publish', async () => {
			mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RAFFLE));

			const result = await publishRaffle('raffle-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe('raffle-1');
				expect(result.data.status).toBe('live');
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns VALIDATION_ERROR on invalid response shape', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await publishRaffle('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
		});
	});

	describe('backend RFC 7807 error', () => {
		test('maps core:raffle:missing-fields from URN type', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 400,
					data: {
						type: 'urn:raffles:problem:core:raffle:missing-fields',
					},
				}),
			);

			const result = await publishRaffle('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.MISSING_FIELDS);
			}
		});

		test('maps core:raffle:not-found from URN type', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({
					status: 404,
					data: {
						type: 'urn:raffles:problem:core:raffle:not-found',
					},
				}),
			);

			const result = await publishRaffle('nonexistent');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.NOT_FOUND);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await publishRaffle('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await publishRaffle('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const result = await publishRaffle('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await publishRaffle('raffle-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
