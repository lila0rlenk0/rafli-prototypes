import { describe, expect, mock, test } from 'bun:test';

const mockCheckoutOrder = mock();
const mockToastError = mock();
const mockToastSuccess = mock();

mock.module('@/services/order/checkout-order', () => ({
	checkoutOrder: mockCheckoutOrder,
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
	mockCheckoutOrder.mockReset();
	mockToastError.mockReset();
	mockToastSuccess.mockReset();
}

describe('buildCheckoutOrder', () => {
	test('returns order from successful checkout', async () => {
		resetAllMocks();
		const order = {
			id: '11111111-1111-4111-8111-111111111111',
			raffleId: RAFFLE_ID,
			status: 'pending',
		};
		mockCheckoutOrder.mockResolvedValueOnce({
			success: true,
			data: { order, isFullyDiscounted: false },
		});

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(result).not.toBeNull();
		expect(result?.order.id).toBe('11111111-1111-4111-8111-111111111111');
		expect(result?.isFullyDiscounted).toBe(false);
		expect(mockToastError).not.toHaveBeenCalled();
	});

	test('returns null and toasts on checkout failure', async () => {
		resetAllMocks();
		mockCheckoutOrder.mockResolvedValueOnce({
			success: false,
			error: 'core:order:create-failed',
		});

		const result = await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(result).toBeNull();
		expect(mockToastError).toHaveBeenCalledTimes(1);
	});

	test('calls onPromoInvalid and toasts promo error for promo-specific failures', async () => {
		resetAllMocks();
		mockCheckoutOrder.mockResolvedValueOnce({
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
	});

	test('returns fully discounted result and toasts success', async () => {
		resetAllMocks();
		const order = {
			id: '33333333-3333-4333-8333-333333333333',
			raffleId: RAFFLE_ID,
			status: 'completed',
		};
		mockCheckoutOrder.mockResolvedValueOnce({
			success: true,
			data: { order, isFullyDiscounted: true },
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
});
