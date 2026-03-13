import { describe, expect, mock, test } from 'bun:test';

import { mockAxiosError } from '../../../tests/helpers/mock-axios';

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

describe('buildCheckoutOrder', () => {
	test('aborts before creating a new order when reusable-order lookup fails', async () => {
		mockGet.mockReset();
		mockCreateOrder.mockReset();
		mockValidatePromoCode.mockReset();
		mockRedeemPromoCode.mockReset();
		mockToastError.mockReset();
		mockToastSuccess.mockReset();

		mockGet.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const result = await buildCheckoutOrder({
			raffleId: 'raffle-1',
			ticketQuantity: 2,
		});

		expect(result).toBeNull();
		expect(mockCreateOrder).not.toHaveBeenCalled();
		expect(mockValidatePromoCode).not.toHaveBeenCalled();
		expect(mockRedeemPromoCode).not.toHaveBeenCalled();
		expect(mockToastError).toHaveBeenCalledTimes(1);
	});
});
