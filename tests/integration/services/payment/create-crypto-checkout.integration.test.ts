import { describe, expect, mock, spyOn, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));

const { createCryptoCheckout } =
	await import('@/services/payment/create-crypto-checkout');

describe('createCryptoCheckout', () => {
	test('returns validated crypto checkout session on valid response', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({
				id: 'session-1',
				amount: '10.00',
				amountRaw: '10000000',
				chainId: 1,
				tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
				treasuryAddress: '0x8e93ae06a3aa1dc901af08d8b1029b95a3ce12d4',
				orderId: 'order-1',
				expiresAt: '2026-03-13T12:00:00.000Z',
				submitDeadline: '2026-03-13T12:10:00.000Z',
				confirmDeadline: '2026-03-13T12:15:00.000Z',
			}),
		);

		const result = await createCryptoCheckout({
			orderId: 'order-1',
			chainId: 1,
			walletAddress: '0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			token: 'usdc',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.tokenAddress).toBe(
				'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
			);
			expect(result.data.treasuryAddress).toBe(
				'0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			);
		}
	});

	test('returns CRYPTO_CHECKOUT_FAILED on invalid response shape', async () => {
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ id: 'session-1' }));

		const result = await createCryptoCheckout({
			orderId: 'order-1',
			chainId: 1,
			walletAddress: '0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			token: 'usdc',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CRYPTO_CHECKOUT_FAILED);
		}
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test('maps wallet-not-verified from RFC 7807 responses', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 412,
				data: {
					type: 'urn:raffles:problem:payments:crypto:wallet-not-verified',
				},
			}),
		);

		const result = await createCryptoCheckout({
			orderId: 'order-1',
			chainId: 1,
			walletAddress: '0x8E93Ae06A3Aa1Dc901aF08D8B1029B95A3CE12D4',
			token: 'usdc',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CRYPTO_WALLET_NOT_VERIFIED);
		}
	});
});
