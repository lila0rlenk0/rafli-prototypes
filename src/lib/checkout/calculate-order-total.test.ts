import { describe, expect, test } from 'bun:test';

import { PROMO_CODE_TYPE, type ValidatedPromoCode } from '@/types/promo-code';

import { calculateOrderTotal, formatPrice } from './calculate-order-total';

// Fixtures at module top per testing rule. The shared `code` and `valid`
// fields stay constant across cases — only `type` and `value` vary.
const FREE_TICKETS_PROMO: ValidatedPromoCode = {
	valid: true,
	code: 'FREE-TKTS',
	type: PROMO_CODE_TYPE.FREE_TICKETS,
	value: '3',
};

const DISCOUNT_PERCENT_PROMO: ValidatedPromoCode = {
	valid: true,
	code: 'PCT5-OFFF',
	type: PROMO_CODE_TYPE.DISCOUNT_PERCENT,
	// Backend convention: per-ticket discount amount in currency units (NOT a %)
	value: '5.00',
};

const DISCOUNT_FIXED_PROMO: ValidatedPromoCode = {
	valid: true,
	code: 'FXED-1000',
	type: PROMO_CODE_TYPE.DISCOUNT_FIXED,
	// Backend convention: total fixed discount in currency units
	value: '10.00',
};

describe('calculateOrderTotal', () => {
	describe('no promo', () => {
		test('subtotal equals quantity * price, no discount', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 4,
				appliedPromo: null,
			});

			expect(result.subtotal).toBe(100);
			expect(result.discount).toBe(0);
			expect(result.total).toBe(100);
			expect(result.isFreeTicketsPromo).toBe(false);
			expect(result.freeTicketCount).toBe(0);
		});

		test('quantity 1 single ticket', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 1,
				appliedPromo: null,
			});

			expect(result.subtotal).toBe(25);
			expect(result.total).toBe(25);
		});
	});

	describe('discount_percent promo (per-ticket discount)', () => {
		test('applies per-ticket discount across quantity', () => {
			// 4 tickets * $25 = $100 subtotal, $5 off per ticket = $20 total discount
			const result = calculateOrderTotal({
				price: 25,
				quantity: 4,
				appliedPromo: DISCOUNT_PERCENT_PROMO,
			});

			expect(result.subtotal).toBe(100);
			expect(result.discount).toBe(20);
			expect(result.total).toBe(80);
			expect(result.isFreeTicketsPromo).toBe(false);
			expect(result.freeTicketCount).toBe(0);
		});

		test('caps discount at subtotal so total never goes negative', () => {
			// $5 per ticket discount, but ticket costs $1 — discount caps at $1*qty
			const result = calculateOrderTotal({
				price: 1,
				quantity: 2,
				appliedPromo: DISCOUNT_PERCENT_PROMO,
			});

			expect(result.subtotal).toBe(2);
			// Per-ticket discount * quantity = $10, but cap is subtotal ($2)
			expect(result.discount).toBe(2);
			expect(result.total).toBe(0);
		});
	});

	describe('discount_fixed promo (total discount)', () => {
		test('applies fixed discount once, regardless of quantity', () => {
			const result = calculateOrderTotal({
				price: 25,
				quantity: 4,
				appliedPromo: DISCOUNT_FIXED_PROMO,
			});

			expect(result.subtotal).toBe(100);
			expect(result.discount).toBe(10);
			expect(result.total).toBe(90);
		});

		test('caps fixed discount at subtotal — high discount, low order', () => {
			const result = calculateOrderTotal({
				price: 5,
				quantity: 1,
				appliedPromo: DISCOUNT_FIXED_PROMO,
			});

			expect(result.subtotal).toBe(5);
			// Discount value $10, but capped at $5 subtotal
			expect(result.discount).toBe(5);
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
				value: '3.7',
			};
			const result = calculateOrderTotal({
				price: 25,
				quantity: 3,
				appliedPromo: fractional,
			});

			expect(result.freeTicketCount).toBe(3);
		});
	});
});

describe('formatPrice', () => {
	test('formats USD with currency symbol', () => {
		expect(formatPrice(25, 'USD')).toBe('$25');
	});

	test('drops trailing zero decimals', () => {
		expect(formatPrice(25.0, 'USD')).toBe('$25');
	});

	test('shows fractional digits up to two decimals', () => {
		// minimumFractionDigits: 0 — so .50 is rendered as .5, not .50.
		// Documented quirk preserved from the original TicketPurchaseCard formatter.
		expect(formatPrice(25.5, 'USD')).toBe('$25.5');
		expect(formatPrice(25.55, 'USD')).toBe('$25.55');
		// Three+ fractional digits round to two via maximumFractionDigits: 2
		expect(formatPrice(25.559, 'USD')).toBe('$25.56');
	});

	test('handles zero', () => {
		expect(formatPrice(0, 'USD')).toBe('$0');
	});
});
