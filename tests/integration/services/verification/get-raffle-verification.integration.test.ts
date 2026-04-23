import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { RaffleVerificationPayload } from '@/types/verification';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const VALID_RESPONSE: RaffleVerificationPayload = {
	raffleId: 'raffle-1',
	title: 'Test Raffle',
	totalTickets: 100,
	manifestHash: '0xmanifest',
	commitTxHash: '0xtx1',
	vrfRequestId: 'vrf-req-1',
	vrfFulfillTxHash: '0xtx2',
	winners: [
		{
			position: 1,
			actualTicketId: 42,
			computedTicketId: 42,
			ticketCode: 'TC-042',
			randomNumber: '123456789',
			formula: 'randomNumber % totalTickets',
			merkleVerified: true,
		},
	],
};

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mock() },
	baseClient: { get: mockGet },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { getRaffleVerification } =
	await import('@/services/verification/get-raffle-verification');

describe('getRaffleVerification', () => {
	test('returns validated verification data on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getRaffleVerification('raffle-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.totalTickets).toBe(100);
			expect(result.data.winners).toHaveLength(1);
			expect(result.data.winners[0].merkleVerified).toBe(true);
		}
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await getRaffleVerification('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getRaffleVerification('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getRaffleVerification('raffle-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
