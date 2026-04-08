import { describe, expect, mock, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockPost = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));

mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => Promise.resolve({ user: { id: 'user-1' } })),
}));

mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(() => Promise.resolve()),
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));

const { submitCryptoTx } = await import('@/services/payment/submit-crypto-tx');

describe('submitCryptoTx', () => {
	test('returns validated submit result on valid response', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ id: 'session-1', status: 'confirming' }),
		);

		const result = await submitCryptoTx({
			sessionId: 'session-1',
			txHash: '0xabc',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe('confirming');
		}
	});

	test('returns CRYPTO_SUBMIT_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ id: 'session-1' }));

		const result = await submitCryptoTx({
			sessionId: 'session-1',
			txHash: '0xabc',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CRYPTO_SUBMIT_FAILED);
		}
	});

	test('maps tx-already-used from RFC 7807 responses', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: { type: 'urn:raffles:problem:payments:crypto:tx-already-used' },
			}),
		);

		const result = await submitCryptoTx({
			sessionId: 'session-1',
			txHash: '0xabc',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CRYPTO_TX_ALREADY_USED);
		}
	});
});
