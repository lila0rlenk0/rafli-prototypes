import { ORDER_STATUS, type OrderWithRaffle } from '@/types/order';

import { getMyOrders } from '@/services/order/get-my-orders';
import type { OrderErrorCode } from '@/types/errors';

// ==========================================
// Order Reuse Logic
// ==========================================

/** Backend max page size currently used by the profile orders UI as well. */
const ORDERS_PAGE_LIMIT = 100;

/**
 * Cap sequential page scans to bound worst-case latency on the checkout hot path.
 * Pending orders are almost always recent — 3 pages (300 orders) covers all
 * realistic cases without unbounded sequential API round-trips.
 */
const MAX_PAGES = 3;

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
	// Step 1: Walk pages until we find a match, exhaust the list, or hit MAX_PAGES.
	//         `/me/orders` does not expose a server-side pending filter yet, so
	//         partial scans are not trustworthy for duplicate-order prevention.
	//         MAX_PAGES caps worst-case latency on the checkout critical path.
	let page = 1;

	while (page <= MAX_PAGES) {
		const ordersResult = await getMyOrders({
			page,
			limit: ORDERS_PAGE_LIMIT,
		});

		// Step 2: Fail closed on any degraded page read.
		//         "Lookup failed" is materially different from "no reusable order".
		if (!ordersResult.success) {
			return {
				kind: 'lookup_failed',
				error: ordersResult.error,
			};
		}

		// Step 3: Return on the first reusable order.
		//         There is no need to scan later pages once checkout can safely reuse.
		const reusableOrder = ordersResult.data.items.find(order =>
			isReusableOrder(order, raffleId, ticketQuantity, promoCode),
		);
		if (reusableOrder) {
			return { kind: 'found', order: reusableOrder };
		}

		// Step 4: Stop only after exhausting the paginated list.
		//         totalPages can be zero for empty histories, so clamp the terminal
		//         page to at least page 1.
		const lastPage = Math.max(ordersResult.data.totalPages, 1);
		if (page >= lastPage) {
			return { kind: 'not_found' };
		}

		page += 1;
	}

	// Exhausted MAX_PAGES without finding a match or empty list.
	// Treat as not_found — caller can safely proceed to create a new order.
	return { kind: 'not_found' };
}
