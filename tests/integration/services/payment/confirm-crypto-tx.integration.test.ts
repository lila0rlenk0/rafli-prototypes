import { describe, expect, mock, spyOn, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));

const { confirmCryptoTx } =
	await import('@/services/payment/confirm-crypto-tx');

describe('confirmCryptoTx', () => {
	test('returns validated confirmation result on valid response', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ id: 'session-1', status: 'completed' }),
		);

		const result = await confirmCryptoTx({
			sessionId: 'session-1',
			txHash: '0xabc',
			chainId: 1,
			confirmations: 1,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('completed');
		}
	});

	test('returns CRYPTO_CONFIRM_FAILED on invalid response shape', async () => {
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ id: 'session-1' }));

		const result = await confirmCryptoTx({
			sessionId: 'session-1',
			txHash: '0xabc',
			chainId: 1,
			confirmations: 1,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED);
		}
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test('maps chain-mismatch from RFC 7807 responses', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:payments:crypto:chain-mismatch' },
			}),
		);

		const result = await confirmCryptoTx({
			sessionId: 'session-1',
			txHash: '0xabc',
			chainId: 1,
			confirmations: 1,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CRYPTO_CHAIN_MISMATCH);
		}
	});
});
