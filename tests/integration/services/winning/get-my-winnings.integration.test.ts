import { describe, expect, mock, test } from 'bun:test';

import { WINNING_ERROR_CODES } from '@/types/errors/winning-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

/** Minimal valid list winnings response */
const VALID_RESPONSE = {
	limit: 10,
	page: 1,
	total: 1,
	totalPages: 1,
	winnings: [
		{
			id: 'winning-1',
			raffleId: 'raffle-1',
			userId: 'user-1',
			position: 1,
			status: 'pending',
			claimType: null,
			claimedAt: null,
			sentAt: null,
			deliveredAt: null,
			receivedAt: null,
			disputedAt: null,
			resolvedAt: null,
			shippingInfo: null,
			proofUrl: null,
			hostNotes: null,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
		},
	],
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getMyWinnings } = await import('@/services/winning/get-my-winnings');

describe('getMyWinnings', () => {
	test('returns validated winnings on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMyWinnings();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.winnings).toHaveLength(1);
			expect(result.data.winnings[0].status).toBe('pending');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ winnings: 'bad' }));

		const result = await getMyWinnings();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getMyWinnings();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getMyWinnings();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
