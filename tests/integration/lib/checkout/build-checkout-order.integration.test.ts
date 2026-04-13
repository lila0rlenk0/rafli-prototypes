import { describe, expect, mock, test } from 'bun:test';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';
import { MOCK_ANALYTICS_EVENTS } from '../../../helpers/mock-events';
import type { Order } from '@/types/order';

// --- Mock toast (sonner) ---

const mockToastError = mock();
const mockToastSuccess = mock();

mock.module('sonner', () => ({
	toast: {
		error: mockToastError,
		success: mockToastSuccess,
	},
}));

// --- Mock checkoutOrder's dependencies so the real implementation runs with controlled I/O ---

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => ({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
}));
// All event exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/analytics/events', () => MOCK_ANALYTICS_EVENTS);
mock.module('@/lib/run-after', () => ({
	runAfter: mock(),
}));

// Import AFTER mocking — no mock.module('@/services/order/checkout-order') needed.
// The real checkoutOrder runs with mocked API client, controlled via mockPost.
const { buildCheckoutOrder } = await import(
	'@/lib/checkout/build-checkout-order'
);

const RAFFLE_ID = '22222222-2222-7222-8222-222222222222';

/** Minimal valid order matching orderSchema */
const VALID_ORDER: Order = {
	id: '11111111-1111-7111-8111-111111111111',
	raffleId: RAFFLE_ID,
	userId: 'user-1',
	ticketQuantity: 2,
	unitPrice: '5.0000',
	totalAmount: '10.0000',
	currency: 'USD',
	promoCode: null,
	status: 'pending',
	createdAt: '2026-03-13T12:00:00.000Z',
	updatedAt: '2026-03-13T12:00:00.000Z',
	raffleName: 'Test Raffle',
};

function resetAllMocks(): void {
	mockPost.mockReset();
	mockToastError.mockReset();
	mockToastSuccess.mockReset();
}

describe('buildCheckoutOrder', () => {
	test('returns order from successful checkout', async () => {
		resetAllMocks();
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_ORDER));

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(result).not.toBeNull();
		expect(result?.order.id).toBe('11111111-1111-7111-8111-111111111111');
		expect(result?.isFullyDiscounted).toBe(false);
		expect(mockToastError).not.toHaveBeenCalled();
	});

	test('returns null and toasts on checkout failure', async () => {
		resetAllMocks();
		// Simulate a 500 error — mapOrderError maps to internal_server_error
		mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(result).toBeNull();
		expect(mockToastError).toHaveBeenCalledTimes(1);
	});

	test('toasts error for promo-related backend errors', async () => {
		resetAllMocks();
		// Promo errors (core:promo:*) aren't in OrderErrorCode — mapOrderError falls
		// through to mapCommonError, so buildCheckoutOrder sees a generic error.
		// This test verifies the toast still fires for promo-adjacent failures.
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 400,
				data: { type: 'urn:raffles:problem:core:promo:expired' },
			}),
		);

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
			promoCode: 'EXPIRED',
		});

		expect(result).toBeNull();
		expect(mockToastError).toHaveBeenCalledTimes(1);
	});

	test('returns fully discounted result and toasts success', async () => {
		resetAllMocks();
		// Fully discounted order — totalAmount zero, status completed
		const fullyDiscountedOrder: Order = {
			...VALID_ORDER,
			id: '33333333-3333-7333-8333-333333333333',
			totalAmount: '0.0000',
			status: 'completed',
		};
		mockPost.mockResolvedValueOnce(mockAxiosResponse(fullyDiscountedOrder));

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 1,
			promoCode: 'FREE100',
		});

		expect(result).not.toBeNull();
		expect(result?.isFullyDiscounted).toBe(true);
		expect(mockToastSuccess).toHaveBeenCalledTimes(1);
	});

	test('does not call onPromoInvalid for non-promo errors', async () => {
		resetAllMocks();
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));
		const onPromoInvalid = mock();

		await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
			promoCode: 'CODE',
			onPromoInvalid,
		});

		expect(onPromoInvalid).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledTimes(1);
	});

	test('does not toast success for non-discounted orders', async () => {
		resetAllMocks();
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_ORDER));

		await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(mockToastSuccess).not.toHaveBeenCalled();
	});

	test('passes correct params to checkoutOrder', async () => {
		resetAllMocks();
		mockPost.mockResolvedValueOnce(mockAxiosResponse(VALID_ORDER));

		await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 3,
			promoCode: 'SAVE10',
		});

		// Verify the API call includes the promo code
		expect(mockPost).toHaveBeenCalledWith(
			'/orders/checkout',
			{
				raffleId: RAFFLE_ID,
				ticketQuantity: 3,
				promoCode: 'SAVE10',
			},
			expect.objectContaining({}),
		);
	});
});
