import { describe, expect, mock, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();
const mockCaptureServiceError = mock();

mock.module('server-only', () => ({}));

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));

// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => Promise.resolve({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));

mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(() => Promise.resolve()),
}));

mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mockCaptureServiceError,
}));

mock.module('@/lib/utils/run-after', () => ({
	runAfter: (task: () => void | Promise<void>) => void task(),
}));

const { payWithCredits } = await import(
	'@/services/payment/pay-with-credits'
);

const VALID_RESPONSE = {
	balanceAfter: '75.0000',
	success: true,
};

describe('payWithCredits', () => {
	test('returns validated spend response on valid response', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.balanceAfter).toBe('75.0000');
			expect(result.data.success).toBe(true);
		}
	});

	test('returns VALIDATION_ERROR on invalid response shape', async () => {
		// Missing `balanceAfter` — Zod parse fails
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ paid: true }),
		);

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
	});

	test('maps insufficient-balance from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:payments:credits:insufficient-balance',
				},
			}),
		);

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.CREDITS_INSUFFICIENT_BALANCE,
			);
		}
	});

	test('maps payment-session-active from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: {
					type: 'urn:raffles:problem:payments:credits:payment-session-active',
				},
			}),
		);

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.CREDITS_PAYMENT_SESSION_ACTIVE,
			);
		}
	});

	test('maps order-not-pending from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 409,
				data: {
					type: 'urn:raffles:problem:payments:credits:order-not-pending',
				},
			}),
		);

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.CREDITS_ORDER_NOT_PENDING,
			);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await payWithCredits('order-1');

		expect(result.success).toBe(false);
	});
});
