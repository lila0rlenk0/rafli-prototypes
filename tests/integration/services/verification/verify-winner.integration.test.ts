import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { VERIFICATION_ERROR_CODES } from '@/types/errors/verification-errors';
import type { WinnerVerification } from '@/types/verification';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

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

const { verifyWinner } = await import('@/services/verification/verify-winner');

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

	// Real backend URN for verify-winner out-of-range position is
	// `core:winner:invalid-position` (raffles.public.api.ts:89). The old
	// `core:verification:winner-not-found` was never emitted — switch cases
	// in `winner-lookup.tsx` silently fell into the default branch.
	test('maps invalid-position from RFC 7807 to WINNER_NOT_FOUND', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:core:winner:invalid-position',
				},
			}),
		);

		const result = await verifyWinner('raffle-1', 999);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(VERIFICATION_ERROR_CODES.WINNER_NOT_FOUND);
		}
	});

	// Backend emits no-vrf-data when the raffle hasn't yet received its VRF
	// randomness — same user-visible meaning as "raffle not completed".
	test('maps no-vrf-data from RFC 7807 to RAFFLE_NOT_COMPLETED', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:raffle:no-vrf-data' },
			}),
		);

		const result = await verifyWinner('raffle-1', 0);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(VERIFICATION_ERROR_CODES.RAFFLE_NOT_COMPLETED);
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
