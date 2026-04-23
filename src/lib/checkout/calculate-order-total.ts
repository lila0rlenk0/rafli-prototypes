import { PROMO_CODE_TYPE, type ValidatedPromoCode } from '@/types/promo-code';

/**
 * Pure-function order math used by both the inline `TicketPurchaseCard`
 * (price breakdown) and the mobile `StickyBuyTicketsCta` (inline price label
 * on the "Enter now" CTA). Centralizing the calculation guarantees the sticky
 * and the card never display divergent totals when the user has a promo
 * applied.
 */

export interface CalculateOrderTotalParams {
	/** Per-ticket price in major currency units (e.g. USD). */
	price: number;
	/** Selected ticket quantity from the store. */
	quantity: number;
	/** Currently applied promo code, or null when none. */
	appliedPromo: ValidatedPromoCode | null;
}

export interface OrderTotal {
	/** quantity * price — pre-discount line total. */
	subtotal: number;
	/** Discount amount applied (always >= 0). */
	discount: number;
	/** subtotal - discount, floored at 0. */
	total: number;
	/** True when the applied promo is a free-tickets grant. */
	isFreeTicketsPromo: boolean;
	/** Number of tickets granted by a free-tickets promo (0 otherwise). */
	freeTicketCount: number;
}

/**
 * Calculates subtotal, discount, total, and free-ticket flags for an order.
 *
 * Backend value semantics — preserved verbatim from the original logic in
 * `TicketPurchaseCard`:
 * - `discount_percent`: per-ticket discount amount (NOT a percentage)
 * - `discount_fixed`: total fixed discount
 * - `free_tickets`: number of tickets (full price discount on `quantity`
 *   tickets, where the store has already locked quantity to the granted
 *   count via `applyPromo`)
 *
 * @param params - Inputs needed to compute the order total
 * @returns Computed order total breakdown
 */
export function calculateOrderTotal(
	params: CalculateOrderTotalParams,
): OrderTotal {
	const { price, quantity, appliedPromo } = params;

	const subtotal = quantity * price;

	if (!appliedPromo) {
		return {
			subtotal,
			discount: 0,
			total: subtotal,
			isFreeTicketsPromo: false,
			freeTicketCount: 0,
		};
	}

	const promoValue = parseFloat(appliedPromo.value);

	// Defensive NaN guard — backend contract says `value` is numeric, but the
	// Zod schema only enforces `z.string()` with no numeric refinement. A bad
	// backend payload ("abc", "", undefined-stringified) would otherwise leak
	// NaN through `subtotal - discount` and surface as "$NaN" in the sticky
	// CTA label and the card price breakdown. Fallback: treat a malformed
	// promo as "no discount applied" so the user at worst pays full price
	// instead of seeing broken totals. The free-tickets flag is suppressed
	// for the same reason — we can't honor a grant whose count we can't read.
	if (Number.isNaN(promoValue)) {
		return {
			subtotal,
			discount: 0,
			total: subtotal,
			isFreeTicketsPromo: false,
			freeTicketCount: 0,
		};
	}

	const discount = computeDiscount({
		type: appliedPromo.type,
		value: promoValue,
		quantity,
		subtotal,
	});
	const isFreeTicketsPromo = appliedPromo.type === PROMO_CODE_TYPE.FREE_TICKETS;

	return {
		subtotal,
		discount,
		total: Math.max(0, subtotal - discount),
		isFreeTicketsPromo,
		// Floor to integer — partial free tickets aren't a thing.
		freeTicketCount: isFreeTicketsPromo ? Math.floor(promoValue) : 0,
	};
}

interface ComputeDiscountInput {
	type: ValidatedPromoCode['type'];
	value: number;
	quantity: number;
	subtotal: number;
}

/**
 * Resolves the discount amount for a given promo type. Extracted so the
 * main `calculateOrderTotal` flow stays linear and the switch is exhaustive.
 */
function computeDiscount(input: ComputeDiscountInput): number {
	const { type, value, quantity, subtotal } = input;
	switch (type) {
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			// `value` is per-ticket discount in currency units, multiply by quantity.
			// Cap at subtotal so a high per-ticket discount can't push total negative.
			return Math.min(value * quantity, subtotal);
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			// `value` is the total fixed discount — cap at subtotal.
			return Math.min(value, subtotal);
		case PROMO_CODE_TYPE.FREE_TICKETS:
			// Full discount: the store has already clamped quantity to the granted
			// count, so subtotal == granted_count * price and the user pays $0.
			return subtotal;
		default: {
			// Exhaustiveness guard — TS errors here if a new promo type is added.
			const _exhaustive: never = type;
			return _exhaustive;
		}
	}
}

/**
 * Formats a price in the user's locale with the given currency code.
 * Pulled out of `TicketPurchaseCard` so the sticky CTA can render the
 * inline "Enter now · $X.XX" label using the same formatting rules.
 *
 * @param amount - Amount in major currency units
 * @param currencyCode - ISO 4217 currency code (e.g. "USD")
 * @returns Localized currency string
 */
export function formatPrice(amount: number, currencyCode: string): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currencyCode,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);
}
