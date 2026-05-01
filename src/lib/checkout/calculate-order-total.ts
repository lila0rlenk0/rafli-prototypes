import { PROMO_CODE_TYPE, type ValidatedPromoCode } from '@/types/promo-code';
import type { RaffleSubscriptionContext } from '@/types/subscription';

/**
 * Pure-function order math used by both the inline `TicketPurchaseCard`
 * (price breakdown) and the mobile `StickyBuyTicketsCta` (inline price label
 * on the "One Time Purchase" CTA). Centralizing the calculation guarantees
 * the sticky and the card never display divergent totals when the user has
 * a promo applied.
 *
 * Math is scaled-int (bigint) end-to-end so per-cent rounding matches what
 * `CheckoutOrderCommand` charges. Drift here would surface as a "displayed
 * price ≠ Stripe charge" toast in the post-checkout verification path.
 *
 * Money helpers below mirror `@shared/decimal` on the backend at scale 4
 * (NUMERIC(19,4)). They are private to this module — no other FE caller has a
 * reason to manipulate scaled-int amounts; the only export is `calculateOrderTotal`
 * itself which returns numbers at the display boundary.
 */

interface CalculateOrderTotalParams {
	/** Per-ticket price in major currency units (e.g. USD). */
	price: number;
	/** Selected ticket quantity from the store. */
	quantity: number;
	/** Currently applied promo code, or null when none. */
	appliedPromo: ValidatedPromoCode | null;
	/** Active subscription (or no-op state) — drives subscriber discount math. */
	subscription: RaffleSubscriptionContext;
}

export interface OrderTotal {
	/** Per-ticket price after subscriber discount, in major currency units. */
	effectiveUnitPrice: number;
	/** quantity * effectiveUnitPrice — pre-promo-discount line total. */
	subtotal: number;
	/** Promo discount applied (always >= 0). Cap math mirrors BE per-type semantics. */
	discount: number;
	/** subtotal - discount, floored at 0. */
	total: number;
	/** Subscriber savings vs. full retail (quantity * price - subtotal). >= 0. */
	subscriberDiscountAmount: number;
	/** True when the applied promo is a free-tickets grant. */
	isFreeTicketsPromo: boolean;
	/** Number of tickets granted by a free-tickets promo (0 otherwise). */
	freeTicketCount: number;
}

// scale 4 = NUMERIC(19,4) on the backend — mirrors @shared/decimal
const MONEY_SCALE = 4;
const SCALE_FACTOR = 10n ** BigInt(MONEY_SCALE);
// 100 * 10^4 — divisor for percent-of-scaled-amount math
const PERCENT_DIVISOR_SCALED4 = 100n * SCALE_FACTOR;
// pure percent divisor — used by subscriber math which inputs an unscaled int percent
const PERCENT_DIVISOR = 100n;

/**
 * Calculates subtotal, discount, total, and free-ticket flags for an order.
 *
 * Backend value semantics — preserved verbatim from CheckoutOrderCommand:
 * - `discount_percent`: percent (1-100) applied to subscriber-effective subtotal,
 *   half-up rounded.
 * - `discount_fixed`: total dollar amount applied across the order, capped at
 *   subscriber-effective subtotal.
 * - `free_tickets`: full discount (store has already locked quantity to grant).
 *
 * Subscriber discount applies to the unit price *before* the promo math runs,
 * matching the BE order: `applySubscriberDiscount` then `computeDiscount(total)`.
 *
 * @param params - Inputs needed to compute the order total
 * @returns Computed order total breakdown
 */
export function calculateOrderTotal(
	params: CalculateOrderTotalParams,
): OrderTotal {
	const { price, quantity, appliedPromo, subscription } = params;

	// Step 1 — promote price + quantity into scaled-int. Price comes from a typed
	// raffle DTO so we trust its shape here; the BE rejects malformed prices on
	// checkout so any drift is contained to the displayed breakdown.
	const baseUnitScaled4 = numberToScaled4(price);
	const effectiveUnitScaled4 = applySubscriberDiscount(
		baseUnitScaled4,
		subscription,
	);
	const qtyBigInt = BigInt(quantity);
	const subtotalScaled4 = effectiveUnitScaled4 * qtyBigInt;
	const subscriberDiscountPerOrder =
		(baseUnitScaled4 - effectiveUnitScaled4) * qtyBigInt;

	const baseBreakdown: Pick<
		OrderTotal,
		'effectiveUnitPrice' | 'subtotal' | 'subscriberDiscountAmount'
	> = {
		effectiveUnitPrice: scaled4ToNumber(effectiveUnitScaled4),
		subtotal: scaled4ToNumber(subtotalScaled4),
		subscriberDiscountAmount: scaled4ToNumber(subscriberDiscountPerOrder),
	};

	// Step 2 — branch on promo type. `appliedPromo == null` short-circuits to the
	// no-discount payload; otherwise computePromoDiscount returns a typed
	// per-type result that the union check guarantees exhaustive.
	if (!appliedPromo) {
		return {
			...baseBreakdown,
			discount: 0,
			total: scaled4ToNumber(subtotalScaled4),
			isFreeTicketsPromo: false,
			freeTicketCount: 0,
		};
	}

	const promo = computePromoDiscount(appliedPromo, subtotalScaled4);
	const totalScaled4 = subtotalScaled4 - promo.discountScaled4;
	return {
		...baseBreakdown,
		discount: scaled4ToNumber(promo.discountScaled4),
		// Floor at 0 — BE caps each promo type at subtotal, but we re-clamp here
		// in case rounding bumps the cap by a single 0.0001 unit.
		total: scaled4ToNumber(totalScaled4 < 0n ? 0n : totalScaled4),
		isFreeTicketsPromo: promo.isFreeTicketsPromo,
		freeTicketCount: promo.freeTicketCount,
	};
}

interface PromoDiscountResult {
	discountScaled4: bigint;
	isFreeTicketsPromo: boolean;
	freeTicketCount: number;
}

/**
 * Resolves the promo discount in scaled-int form. Inputs (`rawValue`,
 * `type`) are BE-validated by the validate-promo-code action; mirroring the
 * BE per-type semantics here keeps preview, charge, and post-checkout
 * verification in lockstep.
 */
function computePromoDiscount(
	promo: ValidatedPromoCode,
	subtotalScaled4: bigint,
): PromoDiscountResult {
	const rawScaled4 = parseToScaled4(promo.rawValue);

	switch (promo.type) {
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			// Fixed discount stacks across the order, capped at subscriber-effective subtotal.
			return {
				discountScaled4:
					rawScaled4 > subtotalScaled4 ? subtotalScaled4 : rawScaled4,
				isFreeTicketsPromo: false,
				freeTicketCount: 0,
			};
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT: {
			// Percent applied to subscriber-effective subtotal, half-up rounded, capped at subtotal.
			// Mirrors the divisor 100*10^4 used by CheckoutOrderCommand.computeDiscount.
			const rounded = divRoundHalfUp(
				subtotalScaled4 * rawScaled4,
				PERCENT_DIVISOR_SCALED4,
			);
			return {
				discountScaled4: rounded > subtotalScaled4 ? subtotalScaled4 : rounded,
				isFreeTicketsPromo: false,
				freeTicketCount: 0,
			};
		}
		case PROMO_CODE_TYPE.FREE_TICKETS: {
			// Full discount: the store has already clamped quantity to the granted count,
			// so subtotal == granted_count * effectiveUnit and the user pays $0.
			// Floor to int — partial free tickets aren't a thing.
			const grantedCount = Number(rawScaled4 / SCALE_FACTOR);
			return {
				discountScaled4: subtotalScaled4,
				isFreeTicketsPromo: true,
				freeTicketCount: grantedCount,
			};
		}
	}
}

/**
 * Apply the subscriber percent discount to a scale-4 base unit price.
 *
 * Inactive subscription or 0% plan returns the base price unchanged.
 * Half-up rounding mirrors the backend so preview, charge, and post-checkout
 * verification all agree to the cent.
 */
function applySubscriberDiscount(
	baseUnitPriceScaled4: bigint,
	subscription: RaffleSubscriptionContext,
): bigint {
	if (!subscription.isActive) return baseUnitPriceScaled4;
	const percent = subscription.discountPercent;
	if (percent <= 0) return baseUnitPriceScaled4;

	const discountScaled4 = divRoundHalfUp(
		baseUnitPriceScaled4 * BigInt(percent),
		PERCENT_DIVISOR,
	);
	return baseUnitPriceScaled4 - discountScaled4;
}

/**
 * Parse a non-negative decimal string into a scale-4 bigint. Inputs come from
 * BE-validated promo `rawValue` strings (always plain decimals like "10.0000")
 * so we don't bother defending against exponent / comma notation here — any
 * unexpected shape is a contract drift bug, not a runtime fallback case.
 */
function parseToScaled4(value: string): bigint {
	const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
	if (!match) {
		throw new RangeError(`parseToScaled4: malformed decimal "${value}"`);
	}
	const whole = match[1];
	// Optional capture groups can be `undefined` at runtime even when TS types
	// them as string. Use `??` to default to empty fractional part.
	const frac = match[2] ?? '';
	// Pad / truncate the fractional part to MONEY_SCALE digits, then concatenate.
	// Truncation is safe: BE values are already at scale 4.
	const fracPadded = frac.padEnd(MONEY_SCALE, '0').slice(0, MONEY_SCALE);
	return BigInt(whole + fracPadded);
}

/**
 * Convert a JS Number into a scale-4 bigint via toFixed(4) + parse. Used at
 * the system boundary where upstream still hands us a `number` (raffle ticket
 * price parsed via parseFloat). All internal math stays on bigint after.
 *
 * `toFixed(4)` cleans up float drift on the $0.10 + $0.20 = 0.30000000000000004
 * boundary that would otherwise leak a wrong cent into the displayed total.
 */
function numberToScaled4(value: number): bigint {
	return parseToScaled4(value.toFixed(MONEY_SCALE));
}

/**
 * Format a scale-4 bigint back to a JS Number (in major currency units).
 * Lossy by design — used only at the display boundary where two-decimal
 * presentation is acceptable.
 */
function scaled4ToNumber(value: bigint): number {
	const negative = value < 0n;
	const abs = negative ? -value : value;
	const whole = abs / SCALE_FACTOR;
	const frac = abs % SCALE_FACTOR;
	const formatted = `${whole.toString()}.${frac.toString().padStart(MONEY_SCALE, '0')}`;
	const result = Number(formatted);
	return negative ? -result : result;
}

/**
 * Half-up rounding for non-negative bigints — same algorithm as
 * `@shared/decimal.divRoundHalfUp` on the backend.
 *
 * Standard `(numerator + divisor/2) / divisor` truncates `divisor/2` for odd
 * divisors. The 2× trick stays exact: `(2*numerator + divisor) / (2*divisor)`.
 */
function divRoundHalfUp(numerator: bigint, divisor: bigint): bigint {
	return (2n * numerator + divisor) / (2n * divisor);
}
