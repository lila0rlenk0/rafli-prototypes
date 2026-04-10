import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { WinnerVerification } from '@/types/verification';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

// Backend returns 0-indexed positions (0 = first place, 1 = second place)
const VALID_RESPONSE: WinnerVerification = {
	position: 0,
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

		// Service accepts 0-indexed positions (matching backend convention)
		const result = await verifyWinner('raffle-1', 0);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.position).toBe(0);
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

	test('passes 0-indexed position directly to backend API', async () => {
		// Service accepts 0-indexed positions — same convention as backend.
		// Callers with human 1-indexed input (e.g., winner-lookup form)
		// must convert to 0-indexed before calling.
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await verifyWinner('raffle-1', 0);

		// Position 0 (first place) should hit /verify-winner/0
		expect(mockGet).toHaveBeenCalledWith('/raffles/raffle-1/verify-winner/0');
	});

	test('passes position 2 directly as index 2 for backend API', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		await verifyWinner('raffle-1', 2);

		expect(mockGet).toHaveBeenCalledWith('/raffles/raffle-1/verify-winner/2');
	});
});
