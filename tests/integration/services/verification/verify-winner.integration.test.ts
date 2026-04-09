import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { WinnerVerification } from '@/types/verification';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE: WinnerVerification = {
	position: 1,
	actualTicketId: 42,
	computedTicketId: 42,
	ticketCode: 'TC-042',
	randomNumber: '123456789',
	formula: 'randomNumber % totalTickets',
	merkleVerified: true,
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

const { verifyWinner } = await import(
	'@/services/verification/verify-winner'
);

describe('verifyWinner', () => {
	test('returns validated winner verification on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await verifyWinner('raffle-1', 1);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.position).toBe(1);
			expect(result.data.merkleVerified).toBe(true);
			expect(result.data.actualTicketId).toBe(result.data.computedTicketId);
		}
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await verifyWinner('raffle-1', 1);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps winner-not-found from RFC 7807', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:core:verification:winner-not-found',
				},
			}),
		);

		const result = await verifyWinner('raffle-1', 999);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(VERIFICATION_ERROR_CODES.WINNER_NOT_FOUND);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await verifyWinner('raffle-1', 1);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await verifyWinner('raffle-1', 1);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
