import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { WINNING_ERROR_CODES } from '@/types/errors/winning-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

/**
 * Minimal valid `ListPastWinnersResponseDto` — mirrors the backend wire shape
 * in `raffles-core-backend/src/core/winnings/dto/winning.dto.ts`. Keep
 * entries complete (every `recentWinnerSchema` field populated) so a success
 * assertion proves the full Zod parse, not just its envelope.
 */
const VALID_RESPONSE = {
	limit: 20,
	page: 1,
	total: 1,
	totalPages: 1,
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
const captureServiceErrorMock = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mockGet },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: captureContractDriftMock,
	captureServiceError: captureServiceErrorMock,
}));

const { getPastWinners } = await import(
	'@/services/winning/get-past-winners'
);

describe('getPastWinners', () => {
	test('returns validated winners on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getPastWinners({ page: 1, limit: 20 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.winners).toHaveLength(1);
			expect(result.data.winners[0].winnerDisplayName).toBe('Anna T.');
		}
	});

	test('returns FETCH_FAILED and reports contract drift on bad response shape', async () => {
		captureContractDriftMock.mockClear();
		captureServiceErrorMock.mockClear();
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ winners: 'bad' }));

		const result = await getPastWinners();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WINNING_ERROR_CODES.FETCH_FAILED);
		}
		expect(captureContractDriftMock).toHaveBeenCalledTimes(1);
		expect(captureServiceErrorMock).not.toHaveBeenCalled();
	});

	test('maps 500 to internal_server_error and reports to Sentry', async () => {
		captureContractDriftMock.mockClear();
		captureServiceErrorMock.mockClear();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getPastWinners();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
		expect(captureServiceErrorMock).toHaveBeenCalledTimes(1);
		expect(captureServiceErrorMock).toHaveBeenCalledWith(
			expect.anything(),
			COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			{ service: 'winning', action: 'get-past-winners' },
		);
		expect(captureContractDriftMock).not.toHaveBeenCalled();
	});

	test('maps network error to network_error and reports to Sentry', async () => {
		captureServiceErrorMock.mockClear();
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getPastWinners();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
		expect(captureServiceErrorMock).toHaveBeenCalledWith(
			expect.anything(),
			COMMON_ERROR_CODES.NETWORK_ERROR,
			{ service: 'winning', action: 'get-past-winners' },
		);
	});
});
