import { describe, expect, mock, spyOn, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));

const { cancelPaymentSession } =
	await import('@/services/payment/cancel-payment-session');

describe('cancelPaymentSession', () => {
	test('returns cancellation result on valid response', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ cancelled: true, cancelledMethod: 'stripe' }),
		);

		const result = await cancelPaymentSession('order-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				cancelled: true,
				cancelledMethod: 'stripe',
			});
		}
	});

	test('returns CANCEL_SESSION_FAILED on invalid response shape', async () => {
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ cancelled: 'yes' }));

		const result = await cancelPaymentSession('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CANCEL_SESSION_FAILED);
		}
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	test('maps payments:cancel:crypto-active from RFC 7807 responses', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 412,
				data: { type: 'urn:raffles:problem:payments:cancel:crypto-active' },
			}),
		);

		const result = await cancelPaymentSession('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.CANCEL_CRYPTO_ACTIVE);
		}
	});
});
