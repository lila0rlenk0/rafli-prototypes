import { describe, expect, test } from 'bun:test';

import { PROMO_CODE_TYPE, type ValidatedPromoCode } from '@/types/promo-code';

import { calculateOrderTotal } from './calculate-order-total';

// Fixtures at module top per testing rule. The shared `code` and `valid`
// fields stay constant across cases — only `type`, `value`, and `rawValue` vary.
//
// Promo math is now driven by `rawValue` (the unmodified BE `promoCode.value`):
// - free_tickets: ticket count as decimal string ("3" → 3 entries).
// - discount_fixed: total dollar discount as decimal string ("10.0000" → $10 off order).
// - discount_percent: percent (1-100) as decimal string ("25.0000" → 25% off line total).
//
// `value` (per-ticket preview from validate response) is no longer used by the
// math — it's preserved on the type only for backwards-compatible UI labels.
const FREE_TICKETS_PROMO: ValidatedPromoCode = {
	valid: true,
	code: 'FREE-TKTS',
	type: PROMO_CODE_TYPE.FREE_TICKETS,
	value: '3',
	rawValue: '3.0000',
};

const DISCOUNT_PERCENT_PROMO: ValidatedPromoCode = {
	valid: true,
	code: 'PCT5-OFFF',
	type: PROMO_CODE_TYPE.DISCOUNT_PERCENT,
	// BE preview surfaces "$1.25" off a $25 ticket for 5% — kept for UI labels.
	value: '1.25',
	// Math input: 5% of subtotal.
	rawValue: '5.0000',
};

const DISCOUNT_FIXED_PROMO: ValidatedPromoCode = {
	valid: true,
	code: 'FXED-1000',
	type: PROMO_CODE_TYPE.DISCOUNT_FIXED,
	// BE preview is per-ticket-capped — used for legacy UI labels only.
	value: '10.00',
	// Math input: $10 off entire order, capped at subtotal at FE math time.
	rawValue: '10.0000',
};

const NO_SUBSCRIPTION = {
	discountPercent: 0,
	isActive: false,
	planName: null,
} as const;
const TEN_PERCENT_SUBSCRIPTION = {
	discountPercent: 10,
	isActive: true,
	planName: 'Starter',
} as const;
const TWENTY_PERCENT_SUBSCRIPTION = {
	discountPercent: 20,
	isActive: true,
	planName: 'Premium',
} as const;
const TWENTY_FIVE_PERCENT_SUBSCRIPTION = {
	discountPercent: 25,
	isActive: true,
	planName: 'Premium',
} as const;

describe('calculateOrderTotal', () => {
	describe('no promo + no subscription', () => {
		test('subtotal equals quantity * price, no discount', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 4,
				appliedPromo: null,
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(100);
			expect(result.discount).toBe(0);
			expect(result.total).toBe(100);
			expect(result.subscriberDiscountAmount).toBe(0);
			expect(result.effectiveUnitPrice).toBe(25);
			expect(result.isFreeTicketsPromo).toBe(false);
			expect(result.freeTicketCount).toBe(0);
		});

		test('quantity 1 single ticket', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 1,
				appliedPromo: null,
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(25);
			expect(result.total).toBe(25);
			expect(result.effectiveUnitPrice).toBe(25);
		});
	});

	describe('subscriber discount — no promo', () => {
		test('20% subscriber on $25 → effective unit $20, total $80 for qty 4', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 4,
				appliedPromo: null,
				subscription: TWENTY_PERCENT_SUBSCRIPTION,
			});

			expect(result.effectiveUnitPrice).toBe(20);
			expect(result.subtotal).toBe(80);
			// Subscriber savings is computed against the un-discounted price for transparency.
			expect(result.subscriberDiscountAmount).toBe(20);
			expect(result.total).toBe(80);
			expect(result.discount).toBe(0);
		});

		test('25% subscriber on $10 → effective unit $7.50, total $30 for qty 4', () => {
			const result = calculateOrderTotal({
				price: 10,
				quantity: 4,
				appliedPromo: null,
				subscription: TWENTY_FIVE_PERCENT_SUBSCRIPTION,
			});

			expect(result.effectiveUnitPrice).toBe(7.5);
			expect(result.subtotal).toBe(30);
			expect(result.subscriberDiscountAmount).toBe(10);
			expect(result.total).toBe(30);
		});

		test('inactive subscription leaves the price unchanged even when discountPercent > 0', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 1,
				appliedPromo: null,
				subscription: {
					discountPercent: 20,
					isActive: false,
					planName: null,
				},
			});

			expect(result.effectiveUnitPrice).toBe(25);
			expect(result.subscriberDiscountAmount).toBe(0);
			expect(result.total).toBe(25);
		});
	});

	describe('discount_percent promo (math now uses rawValue)', () => {
		test('5% off $25 ticket × qty 4 → $5 discount on $100 subtotal', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 4,
				appliedPromo: DISCOUNT_PERCENT_PROMO,
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(100);
			// 5% of $100 = $5
			expect(result.discount).toBe(5);
			expect(result.total).toBe(95);
			expect(result.isFreeTicketsPromo).toBe(false);
		});

		test('100% off caps at subtotal — total never goes negative', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 2,
				appliedPromo: {
					...DISCOUNT_PERCENT_PROMO,
					value: '25',
					rawValue: '100.0000',
				},
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(50);
			expect(result.discount).toBe(50);
			expect(result.total).toBe(0);
		});

		test('subscriber + percent — BE checkout match: 25% sub on $10 + 25% promo → $7.50 unit, $1.875/ticket promo discount', () => {
			// 25% subscriber on $10 → $7.50 effective unit. 25% promo on $7.50 → $1.875 per ticket.
			// qty 2 → subtotal $15, discount $3.75, total $11.25.
			const result = calculateOrderTotal({
				price: 10,
				quantity: 2,
				appliedPromo: {
					...DISCOUNT_PERCENT_PROMO,
					value: '1.875',
					rawValue: '25.0000',
				},
				subscription: TWENTY_FIVE_PERCENT_SUBSCRIPTION,
			});

			expect(result.effectiveUnitPrice).toBe(7.5);
			expect(result.subtotal).toBe(15);
			expect(result.discount).toBe(3.75);
			expect(result.total).toBe(11.25);
			expect(result.subscriberDiscountAmount).toBe(5);
		});
	});

	describe('discount_fixed promo (math now uses rawValue)', () => {
		test('applies fixed discount once across the order, regardless of quantity', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 4,
				appliedPromo: DISCOUNT_FIXED_PROMO,
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(100);
			expect(result.discount).toBe(10);
			expect(result.total).toBe(90);
		});

		test('caps fixed discount at subtotal when discount > order total', () => {
			const result = calculateOrderTotal({
				price: 5,
				quantity: 1,
				appliedPromo: DISCOUNT_FIXED_PROMO,
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(5);
			expect(result.discount).toBe(5);
			expect(result.total).toBe(0);
		});

		test('fixed promo at qty>1 uses raw value (regression: validate response was per-ticket-capped)', () => {
			// $30 fixed promo, $25 ticket × qty 2 = $50 subtotal. BE checkout charges $50 - $30 = $20.
			// Pre-fix the FE used the per-ticket-capped preview ($25) and showed $25 — drift of $5.
			const result = calculateOrderTotal({
				price: 25,
				quantity: 2,
				appliedPromo: {
					...DISCOUNT_FIXED_PROMO,
					value: '25.00',
					rawValue: '30.0000',
				},
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(50);
			expect(result.discount).toBe(30);
			expect(result.total).toBe(20);
		});

		test('subscriber + fixed — cap at subscriber-discounted subtotal', () => {
			// 20% sub on $25 → $20 effective. qty 2 → subtotal $40. $30 promo → $30 discount, total $10.
			const result = calculateOrderTotal({
				price: 25,
				quantity: 2,
				appliedPromo: {
					...DISCOUNT_FIXED_PROMO,
					value: '20.00',
					rawValue: '30.0000',
				},
				subscription: TWENTY_PERCENT_SUBSCRIPTION,
			});

			expect(result.effectiveUnitPrice).toBe(20);
			expect(result.subtotal).toBe(40);
			expect(result.discount).toBe(30);
			expect(result.total).toBe(10);
		});

		test('subscriber + fixed promo above subtotal — caps at subscriber-discounted subtotal', () => {
			// 25% sub on $10 → $7.50. qty 2 → subtotal $15. $50 promo → discount $15, total $0.
			const result = calculateOrderTotal({
				price: 10,
				quantity: 2,
				appliedPromo: {
					...DISCOUNT_FIXED_PROMO,
					value: '7.50',
					rawValue: '50.0000',
				},
				subscription: TWENTY_FIVE_PERCENT_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(15);
			expect(result.discount).toBe(15);
			expect(result.total).toBe(0);
		});
	});

	describe('free_tickets promo', () => {
		test('full subtotal discount, total is zero, isFreeTicketsPromo true', () => {
			// Store has already clamped quantity to grantedCount (3)
			const result = calculateOrderTotal({
				price: 25,
				quantity: 3,
				appliedPromo: FREE_TICKETS_PROMO,
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.subtotal).toBe(75);
			expect(result.discount).toBe(75);
			expect(result.total).toBe(0);
			expect(result.isFreeTicketsPromo).toBe(true);
			expect(result.freeTicketCount).toBe(3);
		});

		test('floors fractional grant count — partial free tickets are not a thing', () => {
			const fractional: ValidatedPromoCode = {
				...FREE_TICKETS_PROMO,
				rawValue: '3.7000',
			};
			const result = calculateOrderTotal({
				price: 25,
				quantity: 3,
				appliedPromo: fractional,
				subscription: NO_SUBSCRIPTION,
			});

			expect(result.freeTicketCount).toBe(3);
		});

		test('subscriber discount does not affect free-ticket flow — total stays $0', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 3,
				appliedPromo: FREE_TICKETS_PROMO,
				subscription: TWENTY_PERCENT_SUBSCRIPTION,
			});

			expect(result.total).toBe(0);
			expect(result.isFreeTicketsPromo).toBe(true);
		});
	});

	describe('subscriber + tier matrix lock — guards against per-tier rounding drift', () => {
		// Locked here so a future plan-tier change can't silently shift displayed
		// totals. Covers the three tiers currently shipped on /pricing.
		test('10% Starter on $10 × qty 5 → $9 unit, $45 total', () => {
			const result = calculateOrderTotal({
				price: 10,
				quantity: 5,
				appliedPromo: null,
				subscription: TEN_PERCENT_SUBSCRIPTION,
			});
			expect(result.effectiveUnitPrice).toBe(9);
			expect(result.total).toBe(45);
		});

		test('15% Basic on $10 × qty 3 → $8.50 unit, $25.50 total', () => {
			const result = calculateOrderTotal({
				price: 10,
				quantity: 3,
				appliedPromo: null,
				subscription: {
					discountPercent: 15,
					isActive: true,
					planName: 'Basic',
				},
			});
			expect(result.effectiveUnitPrice).toBe(8.5);
			expect(result.total).toBe(25.5);
		});

		test('20% Premium on $10 × qty 3 → $8 unit, $24 total', () => {
			const result = calculateOrderTotal({
				price: 10,
				quantity: 3,
				appliedPromo: null,
				subscription: TWENTY_PERCENT_SUBSCRIPTION,
			});
			expect(result.effectiveUnitPrice).toBe(8);
			expect(result.total).toBe(24);
		});
	});
});
