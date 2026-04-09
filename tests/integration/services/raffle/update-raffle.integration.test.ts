import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';
import type { Raffle, UpdateRafflePayload } from '@/types/raffle';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// --- Fixtures ---

const VALID_RAFFLE: Raffle = {
	id: 'raffle-1',
	title: 'Updated Title',
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

const mockPut = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mock(), put: mockPut },
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
}));

// Import AFTER mocking
const { updateRaffle } = await import('@/services/raffle/update-raffle');

describe('updateRaffle', () => {
	describe('success', () => {
		test('returns validated raffle on valid partial update', async () => {
			mockPut.mockResolvedValueOnce(mockAxiosResponse(VALID_RAFFLE));

			const payload: UpdateRafflePayload = { title: 'Updated Title' };
			const result = await updateRaffle('raffle-1', payload);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.title).toBe('Updated Title');
			}
		});
	});

	describe('input validation failure', () => {
		test('returns FETCH_FAILED when payload has invalid field', async () => {
			// Title too short — min 3 chars
			const payload: UpdateRafflePayload = { title: 'ab' };
			const result = await updateRaffle('raffle-1', payload);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});

		test('returns FETCH_FAILED when payload is empty object', async () => {
			// Empty diff — no fields to update
			const result = await updateRaffle('raffle-1', {});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockPut.mockResolvedValueOnce(
				mockAxiosResponse({ id: 123, invalid: true }),
			);

			const result = await updateRaffle('raffle-1', {
				title: 'Valid Title',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('backend RFC 7807 error', () => {
		test('maps core:raffle:not-draft from URN type', async () => {
			mockPut.mockRejectedValueOnce(
				mockAxiosError({
					status: 400,
					data: { type: 'urn:raffles:problem:core:raffle:not-draft' },
				}),
			);

			const result = await updateRaffle('raffle-1', {
				title: 'Valid Title',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.NOT_DRAFT);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPut.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const result = await updateRaffle('raffle-1', {
				title: 'Valid Title',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPut.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const result = await updateRaffle('raffle-1', {
				title: 'Valid Title',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 403 to forbidden', async () => {
			mockPut.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

			const result = await updateRaffle('raffle-1', {
				title: 'Valid Title',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPut.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const result = await updateRaffle('raffle-1', {
				title: 'Valid Title',
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
