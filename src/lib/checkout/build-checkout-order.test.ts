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

/** Helper — builds a mock CheckoutOrderResponse with derived isFullyDiscounted */
function mockCheckoutResponse(overrides: {
	id?: string;
	totalAmount?: string;
	status?: string;
}) {
	const order = {
		id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
		raffleId: RAFFLE_ID,
		status: overrides.status ?? 'pending',
		totalAmount: overrides.totalAmount ?? '10.0000',
	};
	return {
		order,
		isFullyDiscounted: parseFloat(order.totalAmount) === 0,
	};
}

describe('buildCheckoutOrder', () => {
	test('returns order from successful checkout', async () => {
		resetAllMocks();
		mockCheckoutOrder.mockResolvedValueOnce({
			success: true,
			data: mockCheckoutResponse({}),
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
		mockCheckoutOrder.mockResolvedValueOnce({
			success: true,
			data: mockCheckoutResponse({
				id: '33333333-3333-4333-8333-333333333333',
				totalAmount: '0.0000',
				status: 'completed',
			}),
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

	test('does not call onPromoInvalid for non-promo errors', async () => {
		resetAllMocks();
		mockCheckoutOrder.mockResolvedValueOnce({
			success: false,
			error: 'network_error',
		});
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
		mockCheckoutOrder.mockResolvedValueOnce({
			success: true,
			data: mockCheckoutResponse({ totalAmount: '10.0000' }),
		});

		await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 2,
		});

		expect(mockToastSuccess).not.toHaveBeenCalled();
	});

	test('passes correct params to checkoutOrder', async () => {
		resetAllMocks();
		mockCheckoutOrder.mockResolvedValueOnce({
			success: true,
			data: mockCheckoutResponse({}),
		});

		await buildCheckoutOrder({
			raffleId: RAFFLE_ID,
			ticketQuantity: 3,
			promoCode: 'SAVE10',
		});

		expect(mockCheckoutOrder).toHaveBeenCalledWith({
			raffleId: RAFFLE_ID,
			ticketQuantity: 3,
			promoCode: 'SAVE10',
		});
	});
});
