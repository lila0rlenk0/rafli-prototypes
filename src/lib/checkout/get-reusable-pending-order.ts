import { ORDER_STATUS, type OrderWithRaffle } from '@/types/order';

import { getMyOrders } from '@/services/order/get-my-orders';
import type { OrderErrorCode } from '@/types/errors';

// ==========================================
// Order Reuse Logic
// ==========================================

/** Backend max page size currently used by the profile orders UI as well. */
const ORDERS_PAGE_LIMIT = 100;

export type ReusablePendingOrderLookupResult =
	| { kind: 'found'; order: OrderWithRaffle }
	| { kind: 'not_found' }
	| { kind: 'lookup_failed'; error: OrderErrorCode };

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
 * @returns Explicit lookup outcome
 */
export async function getReusablePendingOrder(
	raffleId: string,
	ticketQuantity: number,
	promoCode?: string,
): Promise<ReusablePendingOrderLookupResult> {
	// Step 1: Walk pages until we find a match or exhaust the list.
	//         `/me/orders` does not expose a server-side pending filter yet, so
	//         duplicate-order prevention is only trustworthy if we scan the full
	//         paginated history the backend says exists.
	let page = 1;
	let totalPages = 1;

	while (page <= totalPages) {
		// Step 2: Fetch current page of orders.
		const ordersResult = await getMyOrders({
			page,
			limit: ORDERS_PAGE_LIMIT,
		});

		// Step 3: Fail closed on any degraded page read.
		//         "Lookup failed" is materially different from "no reusable order".
		if (!ordersResult.success) {
			return {
				kind: 'lookup_failed',
				error: ordersResult.error,
			};
		}

		// Step 4: Return on the first reusable order.
		//         There is no need to scan later pages once checkout can safely reuse.
		const reusableOrder = ordersResult.data.items.find(order =>
			isReusableOrder(order, raffleId, ticketQuantity, promoCode),
		);
		if (reusableOrder) {
			return { kind: 'found', order: reusableOrder };
		}

		// Step 5: Update total pages from response and advance.
		//         totalPages can be zero for empty histories, so clamp to at least 1.
		totalPages = Math.max(ordersResult.data.totalPages, 1);
		page += 1;
	}

	return { kind: 'not_found' };
}
