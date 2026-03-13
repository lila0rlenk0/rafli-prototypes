import { describe, expect, mock, test } from 'bun:test';

import {
	mockAxiosError,
	mockAxiosResponse,
} from '../../../tests/helpers/mock-axios';

const mockGet = mock();
const mockCreateOrder = mock();
const mockValidatePromoCode = mock();
const mockRedeemPromoCode = mock();
const mockToastError = mock();
const mockToastSuccess = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mockGet },
	baseClient: { get: mock() },
}));

mock.module('@/services/order/create-order', () => ({
	createOrder: mockCreateOrder,
}));

mock.module('@/services/promo-code/validate-promo-code', () => ({
	validatePromoCode: mockValidatePromoCode,
}));

mock.module('@/services/promo-code/redeem-promo-code', () => ({
	redeemPromoCode: mockRedeemPromoCode,
}));

mock.module('sonner', () => ({
	toast: {
		error: mockToastError,
		success: mockToastSuccess,
	},
}));

const { buildCheckoutOrder } = await import('./build-checkout-order');

const RAFFLE_ID = '22222222-2222-4222-8222-222222222222';

function resetAllMocks() {
	mockGet.mockReset();
	mockCreateOrder.mockReset();
	mockValidatePromoCode.mockReset();
	mockRedeemPromoCode.mockReset();
	mockToastError.mockReset();
	mockToastSuccess.mockReset();
}

function mockNoReusableOrder() {
	mockGet.mockResolvedValueOnce(
		mockAxiosResponse({ total: 0, orders: [], totalPages: 0 }),
	);
}

describe('buildCheckoutOrder', () => {
	test('aborts before creating a new order when reusable-order lookup fails', async () => {
		resetAllMocks();
		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(result).toBeNull();
		expect(mockCreateOrder).not.toHaveBeenCalled();
		expect(mockValidatePromoCode).not.toHaveBeenCalled();
		expect(mockRedeemPromoCode).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledTimes(1);
	});

	test('reuses existing pending order instead of creating a new one', async () => {
		resetAllMocks();
		const existingOrder = {
			id: '11111111-1111-4111-8111-111111111111',
			raffleId: RAFFLE_ID,
			userId: 'user-1',
			ticketQuantity: 2,
			unitPrice: '10.00',
			totalAmount: '20.00',
			currency: 'USD',
			promoCode: null,
			status: 'pending',
			createdAt: '2026-03-13T12:00:00.000Z',
			updatedAt: '2026-03-13T12:00:00.000Z',
			raffleName: 'Test',
			raffleSlug: 'test',
		};
		mockGet.mockResolvedValueOnce(
			mockAxiosResponse({ total: 1, orders: [existingOrder] }),
		);

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(result).not.toBeNull();
		expect(result?.order.id).toBe('11111111-1111-4111-8111-111111111111');
		expect(result?.isFullyDiscounted).toBe(false);
		expect(mockCreateOrder).not.toHaveBeenCalled();
	});

	test('returns null when promo validation fails', async () => {
		resetAllMocks();
		mockNoReusableOrder();
		mockValidatePromoCode.mockResolvedValueOnce({
			success: false,
			error: 'core:promo:expired',
		});
		const onPromoInvalid = mock();

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
			promoCode: 'EXPIRED',
			onPromoInvalid,
		});

		expect(result).toBeNull();
		expect(mockToastError).toHaveBeenCalledTimes(1);
		expect(onPromoInvalid).toHaveBeenCalledTimes(1);
		expect(mockCreateOrder).not.toHaveBeenCalled();
	});

	test('returns fully discounted result when promo covers entire order', async () => {
		resetAllMocks();
		mockNoReusableOrder();
		mockValidatePromoCode.mockResolvedValueOnce({ success: true, data: {} });
		mockCreateOrder.mockResolvedValueOnce({
			success: true,
			data: {
				id: '33333333-3333-4333-8333-333333333333',
				raffleId: RAFFLE_ID,
				userId: 'user-1',
				ticketQuantity: 1,
				unitPrice: '10.00',
				totalAmount: '10.00',
				currency: 'USD',
				promoCode: null,
				status: 'pending',
				createdAt: '2026-03-13T12:00:00.000Z',
				updatedAt: '2026-03-13T12:00:00.000Z',
				raffleName: 'Test',
				raffleSlug: 'test',
			},
		});
		mockRedeemPromoCode.mockResolvedValueOnce({
			success: true,
			data: { ticketsGranted: 0, discountAmount: '10.00' },
		});

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 1,
			promoCode: 'FREE100',
		});

		expect(result).not.toBeNull();
		expect(result?.isFullyDiscounted).toBe(true);
		expect(mockToastSuccess).toHaveBeenCalledTimes(1);
	});

	test('blocks checkout when different promo already applied to reused order', async () => {
		resetAllMocks();
		const existingOrder = {
			id: '44444444-4444-4444-8444-444444444444',
			raffleId: RAFFLE_ID,
			userId: 'user-1',
			ticketQuantity: 2,
			unitPrice: '10.00',
			totalAmount: '20.00',
			currency: 'USD',
			promoCode: 'OLD_CODE',
			status: 'pending',
			createdAt: '2026-03-13T12:00:00.000Z',
			updatedAt: '2026-03-13T12:00:00.000Z',
			raffleName: 'Test',
			raffleSlug: 'test',
		};
		// No reusable order found — forces new order creation.
		// The created order comes back with promoCode: 'OLD_CODE', conflicting
		// with the user's 'NEW_CODE'. This triggers the promo conflict guard.
		mockNoReusableOrder();
		mockValidatePromoCode.mockResolvedValueOnce({ success: true, data: {} });
		mockCreateOrder.mockResolvedValueOnce({
			success: true,
			data: existingOrder, // order with promoCode: 'OLD_CODE'
		});
		const onPromoInvalid = mock();

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
			promoCode: 'NEW_CODE',
			onPromoInvalid,
		});

		expect(result).toBeNull();
		expect(mockToastError).toHaveBeenCalledTimes(1);
		expect(onPromoInvalid).toHaveBeenCalledTimes(1);
	});
});
