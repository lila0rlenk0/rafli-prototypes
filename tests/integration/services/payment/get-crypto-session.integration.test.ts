import { describe, expect, mock, spyOn, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockGet = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));

const { getCryptoSession } =
	await import('@/services/payment/get-crypto-session');

describe('getCryptoSession', () => {
	test('returns validated crypto session on valid response', async () => {
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({
				id: 'session-1',
				status: 'confirming',
				txHash: '0xabc',
				failureReason: null,
				amount: '10.00',
				currency: 'USDC',
				chainId: 1,
				orderId: 'order-1',
				completedAt: null,
				expiresAt: '2026-03-13T12:00:00.000Z',
				submitDeadline: '2026-03-13T12:10:00.000Z',
				confirmDeadline: '2026-03-13T12:15:00.000Z',
			}),
		);

		const result = await getCryptoSession('session-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('confirming');
			expect(result.data.currency).toBe('USDC');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
		mockGet.mockResolvedValueOnce(mockAxiosResponse({ id: 'session-1' }));

		const result = await getCryptoSession('session-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test('maps permission-denied from RFC 7807 responses', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:payments:crypto:permission-denied',
				},
			}),
		);

		const result = await getCryptoSession('session-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CRYPTO_PERMISSION_DENIED);
		}
	});
});
