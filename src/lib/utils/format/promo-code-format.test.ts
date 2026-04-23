import { describe, expect, test } from 'bun:test';

import {
	PROMO_CODE_STATUS,
	PROMO_CODE_TYPE,
	type PromoCode,
} from '@/types/promo-code';
import {
	formatPromoCodeUsage,
	formatPromoCodeValue,
	formatUsageLimit,
	getPromoCodeStatus,
} from './promo-code-format';

// Shared fixture — only fields relevant per test are overridden. Keep the
// rest constant so the intent of each case stays visually obvious.
const BASE_PROMO_CODE: PromoCode = {
	id: 'id',
	code: 'ABCD-EFGH',
	raffleId: 'raffle-id',
	bulkId: null,
	type: PROMO_CODE_TYPE.FREE_TICKETS,
	value: '1',
	maxUses: 10,
	maxRedemptionsPerUser: 1,
	usedCount: 0,
	isActive: true,
	expiresAt: null,
	createdAt: '2026-01-01T00:00:00Z',
};

describe('getPromoCodeStatus', () => {
	// Derived status — backend stores `isActive`, but UI needs a richer enum
	// (active / inactive / expired / exhausted) to render the correct badge.
	describe('inactive takes precedence over everything else', () => {
		test('returns inactive even when expired or exhausted would otherwise apply', () => {
			const code: PromoCode = {
				...BASE_PROMO_CODE,
				isActive: false,
				expiresAt: '2000-01-01T00:00:00Z',
				maxUses: 1,
				usedCount: 5,
			};
			expect(getPromoCodeStatus(code)).toBe(PROMO_CODE_STATUS.INACTIVE);
		});
	});

	describe('expired beats exhausted', () => {
		test('returns expired when expiresAt is in the past', () => {
			const code: PromoCode = {
				...BASE_PROMO_CODE,
				expiresAt: '2000-01-01T00:00:00Z',
				maxUses: 1,
				usedCount: 10,
			};
			expect(getPromoCodeStatus(code)).toBe(PROMO_CODE_STATUS.EXPIRED);
		});

		test('returns active for a future expiresAt (well past 2026)', () => {
			const code: PromoCode = {
				...BASE_PROMO_CODE,
				expiresAt: '2999-01-01T00:00:00Z',
			};
			expect(getPromoCodeStatus(code)).toBe(PROMO_CODE_STATUS.ACTIVE);
		});
	});

	describe('exhausted', () => {
		test('returns exhausted when usedCount reaches capped maxUses', () => {
			const code: PromoCode = {
				...BASE_PROMO_CODE,
				maxUses: 3,
				usedCount: 3,
			};
			expect(getPromoCodeStatus(code)).toBe(PROMO_CODE_STATUS.EXHAUSTED);
		});

		test('still active one redemption short of cap', () => {
			const code: PromoCode = {
				...BASE_PROMO_CODE,
				maxUses: 3,
				usedCount: 2,
			};
			expect(getPromoCodeStatus(code)).toBe(PROMO_CODE_STATUS.ACTIVE);
		});

		test('unlimited cap (maxUses=0) never reports exhausted', () => {
			// maxUses=0 represents uncapped — the exhausted branch must be
			// skipped or the badge would flip to "exhausted" immediately.
			const code: PromoCode = {
				...BASE_PROMO_CODE,
				maxUses: 0,
				usedCount: 9999,
			};
			expect(getPromoCodeStatus(code)).toBe(PROMO_CODE_STATUS.ACTIVE);
		});
	});

	describe('active baseline', () => {
		test('returns active for a fresh code with no constraints triggered', () => {
			expect(getPromoCodeStatus(BASE_PROMO_CODE)).toBe(
				PROMO_CODE_STATUS.ACTIVE,
			);
		});

		test('null expiresAt is treated as no expiry', () => {
			const code: PromoCode = { ...BASE_PROMO_CODE, expiresAt: null };
			expect(getPromoCodeStatus(code)).toBe(PROMO_CODE_STATUS.ACTIVE);
		});
	});
});

describe('formatPromoCodeValue — discount branches', () => {
	// Previously only the free_tickets branch was covered. Discount types are
	// the majority of created promos, so these were the highest-value gap.
	test('formats fixed discounts as currency with 2 decimals', () => {
		const code: PromoCode = {
			...BASE_PROMO_CODE,
			type: PROMO_CODE_TYPE.DISCOUNT_FIXED,
			value: '12.5',
		};
		expect(formatPromoCodeValue(code)).toBe('$12.50');
	});

	test('fixed discount pads whole-dollar values to 2 decimals', () => {
		const code: PromoCode = {
			...BASE_PROMO_CODE,
			type: PROMO_CODE_TYPE.DISCOUNT_FIXED,
			value: '10',
		};
		expect(formatPromoCodeValue(code)).toBe('$10.00');
	});

	test('formats percent discounts as integer percent (floors fractional input)', () => {
		// Value can drift as a string decimal from BE; UI floors so we never
		// render "12.7%" which would mismatch the checkout math.
		const code: PromoCode = {
			...BASE_PROMO_CODE,
			type: PROMO_CODE_TYPE.DISCOUNT_PERCENT,
			value: '12.7',
		};
		expect(formatPromoCodeValue(code)).toBe('12%');
	});
});

describe('formatPromoCodeUsage', () => {
	test('formats usage as used/max for bounded codes', () => {
		const code: PromoCode = {
			...BASE_PROMO_CODE,
			maxUses: 100,
			usedCount: 25,
		};
		expect(formatPromoCodeUsage(code)).toBe('25/100');
	});

	test('uses infinity symbol for unbounded codes (maxUses=0)', () => {
		const code: PromoCode = {
			...BASE_PROMO_CODE,
			maxUses: 0,
			usedCount: 7,
		};
		expect(formatPromoCodeUsage(code)).toBe('7/∞');
	});

	test('reports zero usage for an untouched code', () => {
		const code: PromoCode = {
			...BASE_PROMO_CODE,
			maxUses: 5,
			usedCount: 0,
		};
		expect(formatPromoCodeUsage(code)).toBe('0/5');
	});
});

describe('formatUsageLimit', () => {
	// Tiny helper but different call site than formatPromoCodeUsage — host
	// configuration screens show just the cap when there's no usage yet.
	test('returns infinity symbol for a cap of 0 (unlimited)', () => {
		expect(formatUsageLimit(0)).toBe('∞');
	});

	test('returns the numeric cap as a string', () => {
		expect(formatUsageLimit(50)).toBe('50');
	});
});
