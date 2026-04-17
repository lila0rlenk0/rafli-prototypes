import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { WINNING_ERROR_CODES } from '@/types/errors/winning-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE = {
	winners: [
		{
			position: 1,
			prizeAmount: '1000.00',
			prizeCurrency: 'USD',
			prizeLabel: 'Grand prize',
			raffleId: 'raffle-1',
			raffleSlug: 'grand-raffle',
			raffleTitle: 'Grand Raffle',
			ticketCode: 'RF-0001',
			winnerDisplayName: 'Anna T.',
			wonAt: '2026-01-01T00:00:00Z',
		},
	],
};

const mockGet = mock();
const captureContractDriftMock = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mockGet },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: captureContractDriftMock,
	captureServiceError: mock(),
}));

const { getRecentWinners } = await import('@/services/winning/get-recent-winners');

describe('getRecentWinners', () => {
	test('returns validated winners on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getRecentWinners({ limit: 6 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.winners).toHaveLength(1);
			expect(result.data.winners[0].winnerDisplayName).toBe('Anna T.');
		}
		expect(mockGet).toHaveBeenCalledWith('/winnings/recent', {
			params: { limit: '6' },
		});
	});

	test('returns FETCH_FAILED and reports contract drift on bad response shape', async () => {
		captureContractDriftMock.mockClear();
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ winners: 'bad' }));

		const result = await getRecentWinners();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.FETCH_FAILED);
		}
		expect(captureContractDriftMock).toHaveBeenCalledTimes(1);
	});

	test('maps 401 to unauthorized', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

		const result = await getRecentWinners();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
		}
	});

	test('maps network errors to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getRecentWinners();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
