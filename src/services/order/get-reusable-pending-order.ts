import { ORDER_STATUS, type OrderWithRaffle } from '@/types/order';

import { getMyOrders } from './get-my-orders';

// ==========================================
// Order Reuse Logic
// ==========================================

/**
 * Checks if order matches raffle and quantity requirements
 */
function matchesRaffleAndQuantity(
	order: OrderWithRaffle,
	raffleId: string,
	ticketQuantity: number,
): boolean {
	return order.raffleId === raffleId && order.ticketQuantity === ticketQuantity;
}

/**
 * Checks if order promo code is compatible with selected code
 */
function hasCompatiblePromoCode(
	order: OrderWithRaffle,
	selectedPromoCode?: string,
): boolean {
	if (!selectedPromoCode) {
		return order.promoCode === null;
	}
	return order.promoCode === null || order.promoCode === selectedPromoCode;
}

/**
 * Checks if order can be reused for checkout
 * Must be PENDING, same raffle/quantity, and compatible promo code
 */
function isReusableOrder(
	order: OrderWithRaffle,
	raffleId: string,
	ticketQuantity: number,
	selectedPromoCode?: string,
): boolean {
	if (order.status !== ORDER_STATUS.PENDING) return false;
	if (!matchesRaffleAndQuantity(order, raffleId, ticketQuantity)) return false;
	return hasCompatiblePromoCode(order, selectedPromoCode);
}

/**
 * Gets existing pending order for same raffle + quantity.
 * Reuses pending orders to avoid creating duplicates on retries.
 *
 * @param raffleId - Target raffle ID
 * @param ticketQuantity - Desired ticket count
 * @param promoCode - Optional promo code to match
 * @returns Reusable order or null
 */
export async function getReusablePendingOrder(
	raffleId: string,
	ticketQuantity: number,
	promoCode?: string,
): Promise<OrderWithRaffle | null> {
	const ordersResult = await getMyOrders({ page: 1, limit: 100 });

	if (!ordersResult.success) return null;

	const reusableOrder = ordersResult.data.items.find(order =>
		isReusableOrder(order, raffleId, ticketQuantity, promoCode),
	);

	return reusableOrder ?? null;
}
