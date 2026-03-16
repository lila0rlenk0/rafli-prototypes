import { describe, expect, mock, spyOn, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { WALLET_ERROR_CODES } from '@/types/errors/wallet-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));

const { getWallets } = await import('@/services/wallet/get-wallets');

describe('getWallets', () => {
	test('returns validated wallets on valid response', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				wallets: [
					{
						id: 'wallet-1',
						address: '0x8e93ae06a3aa1dc901af08d8b1029b95a3ce12d4',
						verifiedAt: '2026-03-13T12:00:00.000Z',
						createdAt: '2026-03-13T11:00:00.000Z',
					},
				],
			}),
		);

		const result = await getWallets();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.wallets[0]?.address).toBe(
				'0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ wallets: [{}] }));

		const result = await getWallets();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(WALLET_ERROR_CODES.FETCH_FAILED);
		}
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test('maps global auth errors from RFC 7807 responses', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 401,
				data: {
					type: 'urn:raffles:problem:global:auth:unauthenticated',
				},
			}),
		);

		const result = await getWallets();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.GLOBAL_AUTH_UNAUTHENTICATED);
		}
	});
});
