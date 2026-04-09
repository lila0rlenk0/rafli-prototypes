import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { TicketVerification } from '@/types/verification';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE: TicketVerification = {
	ticketId: 42,
	ticketCode: 'TC-042',
	raffleId: 'raffle-1',
	merkleVerified: true,
	chunkIndex: 0,
	isVoided: false,
	isWinner: true,
	winnerPosition: 1,
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

const { verifyTicket } = await import(
	'@/services/verification/verify-ticket'
);

describe('verifyTicket', () => {
	test('returns validated ticket verification on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await verifyTicket('raffle-1', 'TC-042');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.ticketCode).toBe('TC-042');
			expect(result.data.merkleVerified).toBe(true);
			expect(result.data.isWinner).toBe(true);
		}
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await verifyTicket('raffle-1', 'TC-042');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps ticket-not-found from RFC 7807', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: {
					type: 'urn:raffles:problem:core:verification:ticket-not-found',
				},
			}),
		);

		const result = await verifyTicket('raffle-1', 'BAD-CODE');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(VERIFICATION_ERROR_CODES.TICKET_NOT_FOUND);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await verifyTicket('raffle-1', 'TC-042');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
