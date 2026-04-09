import { describe, expect, mock, test } from 'bun:test';

import { PAYMENT_ERROR_CODES } from '@/types/errors/payment-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

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

// runAfter falls back to immediate execution outside Next.js request scope
mock.module('@/lib/run-after', () => ({
	runAfter: (task: () => void | Promise<void>) => void task(),
}));

const { createAtomicCryptoCheckout } = await import(
	'@/services/payment/create-atomic-crypto-checkout'
);

/** Valid payload matching AtomicCryptoCheckoutPayload */
const VALID_PAYLOAD = {
	raffleId: '550e8400-e29b-41d4-a716-446655440000',
	ticketQuantity: 2,
	chainId: 42161,
	walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as `0x${string}`,
	token: 'usdc',
};

/** Valid response matching atomicCryptoCheckoutResponseSchema */
const VALID_RESPONSE = {
	order: {
		id: 'order-1',
		status: 'pending',
		totalAmount: '20.0000',
	},
	session: {
		id: 'session-1',
		amount: '20.00',
		walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
		amountRaw: '20000000',
		chainId: 42161,
		tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
		treasuryAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
		orderId: 'order-1',
		expiresAt: '2026-04-09T12:00:00.000Z',
		submitDeadline: '2026-04-09T12:10:00.000Z',
		confirmDeadline: '2026-04-09T12:15:00.000Z',
		confirmationTarget: 12,
	},
	previousSessionCancelled: false,
};

describe('createAtomicCryptoCheckout', () => {
	test('returns validated checkout response on valid response', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_RESPONSE));

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.order.id).toBe('order-1');
			expect(result.data.session?.chainId).toBe(42161);
			expect(result.data.previousSessionCancelled).toBe(false);
		}
	});

	test('handles null session when order is $0 (fully discounted)', async () => {
		const zeroOrderResponse = {
			...VALID_RESPONSE,
			order: { id: 'order-2', status: 'completed', totalAmount: '0.0000' },
			session: null,
		};
		mockPost.mockResolvedValueOnce(mockAxiosResponse(zeroOrderResponse));

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.session).toBeNull();
			expect(result.data.order.status).toBe('completed');
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		// Missing required `order` field — Zod parse fails
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ session: null }),
		);

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps wallet-not-verified from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:payments:crypto:wallet-not-verified',
				},
			}),
		);

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.CRYPTO_WALLET_NOT_VERIFIED,
			);
		}
	});

	test('maps unsupported-chain from RFC 7807 response', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:payments:crypto:unsupported-chain',
				},
			}),
		);

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(
				PAYMENT_ERROR_CODES.CRYPTO_UNSUPPORTED_CHAIN,
			);
		}
	});

	test('calls captureServiceError on API failure', async () => {
		mockCaptureServiceError.mockReset();
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(false);
		expect(mockCaptureServiceError).toHaveBeenCalled();
	});

	test('maps network error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ERR_NETWORK' }),
		);

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(false);
	});

	test('maps timeout error to error code', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({ code: 'ECONNABORTED' }),
		);

		const result = await createAtomicCryptoCheckout(VALID_PAYLOAD);

		expect(result.success).toBe(false);
	});
});
