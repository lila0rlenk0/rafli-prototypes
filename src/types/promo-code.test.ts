import { describe, expect, test } from 'bun:test';

import {
	formatPromoCodeValue,
	getPromoCodeDescription,
	PROMO_CODE_TYPE,
	type PromoCode,
	type ValidatedPromoCode,
} from './promo-code';

// Shared fixture for the host-facing `formatPromoCodeValue` — only `type`
// and `value` vary per case so keep the rest constant.
const BASE_PROMO_CODE: PromoCode = {
	id: 'id',
	code: 'ABCD-EFGH',
	raffleId: 'raffle-id',
	bulkId: null,
	type: PROMO_CODE_TYPE.FREE_TICKETS,
	value: '0',
	maxUses: 1,
	maxRedemptionsPerUser: 1,
	usedCount: 0,
	isActive: true,
	expiresAt: null,
	createdAt: '2026-01-01T00:00:00Z',
};

// Shared fixture for the participant-facing `getPromoCodeDescription`.
// ValidatedPromoCode has fewer fields — only the display-relevant ones.
const BASE_VALIDATED: ValidatedPromoCode = {
	valid: true,
	code: 'ABCD-EFGH',
	type: PROMO_CODE_TYPE.FREE_TICKETS,
	value: '0',
};

describe('getPromoCodeDescription', () => {
	// Legal framing: participant-facing copy must say "bonus entries" (not
	// "free tickets") so grants read as bundled entries included with the
	// Access Pass, matching the checkout disclaimer.
	describe('free tickets — participant-facing copy', () => {
		test('pluralizes for multiple entries', () => {
			const description = getPromoCodeDescription({
				...BASE_VALIDATED,
				type: PROMO_CODE_TYPE.FREE_TICKETS,
				value: '3',
			});
			expect(description).toBe('3 bonus entries');
		});

		test('singularizes for a single entry', () => {
			const description = getPromoCodeDescription({
				...BASE_VALIDATED,
				type: PROMO_CODE_TYPE.FREE_TICKETS,
				value: '1',
			});
			expect(description).toBe('1 bonus entry');
		});

		test('floors fractional grant counts — partial entries are not a thing', () => {
			// Backend sends decimals only through promo value drift; floor to
			// int so the displayed grant never over-promises what the system
			// can issue.
			const description = getPromoCodeDescription({
				...BASE_VALIDATED,
				type: PROMO_CODE_TYPE.FREE_TICKETS,
				value: '2.7',
			});
			expect(description).toBe('2 bonus entries');
		});
	});

	describe('fixed discount', () => {
		test('formats as currency off the order', () => {
			const description = getPromoCodeDescription({
				...BASE_VALIDATED,
				type: PROMO_CODE_TYPE.DISCOUNT_FIXED,
				value: '10.00',
			});
			expect(description).toBe('$10.00 off your order');
		});
	});

	describe('percent discount', () => {
		test('formats as per-entry discount (backend returns amount, not %)', () => {
			// Backend convention: `discount_percent` returns the per-ticket
			// discount *amount*, not the percentage. Copy is "per entry" to
			// match the Access Pass framing elsewhere in the UI.
			const description = getPromoCodeDescription({
				...BASE_VALIDATED,
				type: PROMO_CODE_TYPE.DISCOUNT_PERCENT,
				value: '5.00',
			});
			expect(description).toBe('$5.00 off per entry');
		});
	});
});

describe('formatPromoCodeValue', () => {
	// Host-facing promo table. Same entry-centric framing as the
	// participant-facing copy so hosts see what participants will see.
	describe('free tickets — host-facing value column', () => {
		test('pluralizes for multiple entries', () => {
			const value = formatPromoCodeValue({
				...BASE_PROMO_CODE,
				type: PROMO_CODE_TYPE.FREE_TICKETS,
				value: '5',
			});
			expect(value).toBe('5 entries');
		});

		test('singularizes for a single entry', () => {
			const value = formatPromoCodeValue({
				...BASE_PROMO_CODE,
				type: PROMO_CODE_TYPE.FREE_TICKETS,
				value: '1',
			});
			expect(value).toBe('1 entry');
		});
	});
});
