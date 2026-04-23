import { describe, expect, mock, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockGet = mock();
const mockCaptureServiceError = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet, post: mock() },
	baseClient: { get: mock() },
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));

const { getCheckoutStatus } = await import(
	'@/services/payment/get-checkout-status'
);

/** Valid response matching checkoutStatusSchema */
const VALID_RESPONSE = {
	activeMethod: 'crypto',
	canRetry: false,
	canSwitchMethod: false,
	crypto: {
		blockConfirmations: 5,
		chainId: 42161,
		confirmationTarget: 12,
		confirmDeadline: '2026-04-09T12:15:00.000Z',
		expiresAt: '2026-04-09T12:00:00.000Z',
		failureReason: null,
		id: 'session-1',
		isActive: true,
		status: 'confirming',
		submitDeadline: '2026-04-09T12:10:00.000Z',
		txHash: '0xabc123',
	},
	orderId: 'order-1',
	orderStatus: 'pending',
	phase: 'confirming',
	stripe: null,
};

describe('getCheckoutStatus', () => {
	test('returns validated checkout status on valid response', async () => {
		mockGet.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await getCheckoutStatus('order-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.phase).toBe('confirming');
			expect(result.data.activeMethod).toBe('crypto');
			expect(result.data.crypto?.txHash).toBe('0xabc123');
			expect(result.data.stripe).toBeNull();
		}
	});

	test('handles awaiting_payment phase with no sessions', async () => {
		const awaitingResponse = {
			...VALID_RESPONSE,
			activeMethod: 'none',
			crypto: null,
			phase: 'awaiting_payment',
		};
		mockGet.mockResolvedValueOnce(mockAxiosResponse(awaitingResponse));

		const result = await getCheckoutStatus('order-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.phase).toBe('awaiting_payment');
			expect(result.data.crypto).toBeNull();
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Missing required `phase` field — Zod parse fails
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ orderId: 'order-1' }),
		);

		const result = await getCheckoutStatus('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps order-permission-denied from RFC 7807 response', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({
				status: 403,
				data: {
					type: 'urn:raffles:problem:payments:order:permission-denied',
				},
			}),
		);

		const result = await getCheckoutStatus('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.ORDER_PERMISSION_DENIED,
			);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockGet.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await getCheckoutStatus('order-1');

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await getCheckoutStatus('order-1');

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockGet.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await getCheckoutStatus('order-1');

		expect(result.success).toBe(false);
	});
});
