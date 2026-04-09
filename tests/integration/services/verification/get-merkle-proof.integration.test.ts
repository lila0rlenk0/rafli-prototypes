import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import type { MerkleProof } from '@/types/verification';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const VALID_RESPONSE: MerkleProof = {
	ticketId: 42,
	leafHash: '0xabc123',
	proof: ['0xdef456', '0x789ghi'],
	root: '0xroot123',
	chunkIndex: 0,
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

const { getMerkleProof } = await import(
	'@/services/verification/get-merkle-proof'
);

describe('getMerkleProof', () => {
	test('returns validated merkle proof on success', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getMerkleProof('raffle-1', 42);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.ticketId).toBe(42);
			expect(result.data.merkleVerified).toBe(true);
			expect(result.data.proof).toHaveLength(2);
		}
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const result = await getMerkleProof('raffle-1', 42);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps proof-not-found from RFC 7807', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:core:verification:proof-not-found' },
			}),
		);

		const result = await getMerkleProof('raffle-1', 999);

		expect(result.success).toBe(false);
		// Verification errors map to the verification error codes
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await getMerkleProof('raffle-1', 42);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});

	test('maps 500 to internal_server_error', async () => {
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getMerkleProof('raffle-1', 42);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
		}
	});
});
