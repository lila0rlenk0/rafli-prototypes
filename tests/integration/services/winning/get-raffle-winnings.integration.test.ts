import { describe, expect, mock, test } from 'bun:test';

import { WINNING_ERROR_CODES } from '@/types/errors/winning-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

/** Minimal valid host raffle winnings response */
const VALID_RESPONSE = {
	items: [
		{
			id: 'winning-1',
			raffleId: 'raffle-1',
			userId: 'user-1',
			position: 1,
			status: 'awaiting_host',
			claimType: 'shipping',
			claimedAt: '2026-01-02T00:00:00Z',
			sentAt: null,
			deliveredAt: null,
			receivedAt: null,
			disputedAt: null,
			resolvedAt: null,
			shippingInfo: {
				name: 'John Doe',
				address: '123 Main St',
				city: 'Springfield',
				zip: '12345',
				country: 'US',
			},
			proofUrl: null,
			hostNotes: null,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-02T00:00:00Z',
			userName: 'johndoe',
			userAvatar: null,
		},
	],
	limit: 10,
	page: 1,
	total: 1,
	totalPages: 1,
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

const { getRaffleWinnings } = await import(
	'@/services/winning/get-raffle-winnings'
);

describe('getRaffleWinnings', () => {
	test('returns validated host winnings on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getRaffleWinnings('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0].userName).toBe('johndoe');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ items: 'bad' }));

		const result = await getRaffleWinnings('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps 403 to forbidden', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 403 }));

		const result = await getRaffleWinnings('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.FORBIDDEN);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getRaffleWinnings('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
