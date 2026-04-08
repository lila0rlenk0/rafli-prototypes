import { describe, expect, mock, test } from 'bun:test';

import { WALLET_ERROR_CODES } from '@/types/errors/wallet-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { verifyWallet } = await import('@/services/wallet/verify-wallet');

describe('verifyWallet', () => {
	test('returns validated wallet on valid response', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				id: 'wallet-1',
				address: '0x8e93ae06a3aa1dc901af08d8b1029b95a3ce12d4',
				verifiedAt: '2026-03-13T12:00:00.000Z',
				createdAt: '2026-03-13T11:00:00.000Z',
			}),
		);

		const result = await verifyWallet({
			address: '0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			message:
				'Link wallet 0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4 to Raffles account user-1 at 2026-03-13T12:00:00.000Z',
			signature: '0xabc',
			timestamp: '2026-03-13T12:00:00.000Z',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.address).toBe(
				'0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			);
		}
	});

	test('returns VALIDATION_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ id: 'wallet-1' }));

		const result = await verifyWallet({
			address: '0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			message:
				'Link wallet 0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4 to Raffles account user-1 at 2026-03-13T12:00:00.000Z',
			signature: '0xabc',
			timestamp: '2026-03-13T12:00:00.000Z',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WALLET_ERROR_CODES.VALIDATION_FAILED);
		}
		// captureContractDrift called internally — Sentry is no-op without DSN
	});

	test('maps invalid-timestamp from RFC 7807 responses', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:auth:wallet:invalid-timestamp',
				},
			}),
		);

		const result = await verifyWallet({
			address: '0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			message:
				'Link wallet 0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4 to Raffles account user-1 at 2026-03-13T12:00:00.000Z',
			signature: '0xabc',
			timestamp: '2026-03-13T12:00:00.000Z',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WALLET_ERROR_CODES.INVALID_TIMESTAMP);
		}
	});
});
