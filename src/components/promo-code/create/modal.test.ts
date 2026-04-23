import { describe, expect, test } from 'bun:test';

import { PROMO_CODE_TYPE } from '@/types/promo-code';

import { createPromoCodeFormSchema } from './schema';

/**
 * Valid base payload — all fields set to passing values.
 * Tests override individual fields to isolate each assertion.
 */
const VALID_BASE = {
	count: 1,
	type: PROMO_CODE_TYPE.DISCOUNT_FIXED,
	value: 5,
	unlimitedUses: false,
	maxUses: 1,
	unlimitedPerUser: false,
	maxRedemptionsPerUser: 1,
	noExpiration: true,
	expiresAt: undefined,
} as const;

describe('createPromoCodeFormSchema', () => {
	test('accepts valid payload with limited uses', () => {
		const result = createPromoCodeFormSchema.safeParse(VALID_BASE);
		expect(result.success).toBe(true);
	});

	test('accepts maxUses: 0 when unlimitedUses is true', () => {
		// 0 = unlimited is the API convention — valid when user explicitly chose unlimited
		const result = createPromoCodeFormSchema.safeParse({
			...VALID_BASE,
			unlimitedUses: true,
			maxUses: 0,
		});
		expect(result.success).toBe(true);
	});

	test('rejects maxUses: 0 when unlimitedUses is false', () => {
		// Bug: user didn't check "unlimited" but maxUses=0 would send unlimited to API
		const result = createPromoCodeFormSchema.safeParse({
			...VALID_BASE,
			unlimitedUses: false,
			maxUses: 0,
		});
		expect(result.success).toBe(false);
	});

	test('accepts maxRedemptionsPerUser: 0 when unlimitedPerUser is true', () => {
		const result = createPromoCodeFormSchema.safeParse({
			...VALID_BASE,
			unlimitedPerUser: true,
			maxRedemptionsPerUser: 0,
		});
		expect(result.success).toBe(true);
	});

	test('rejects maxRedemptionsPerUser: 0 when unlimitedPerUser is false', () => {
		// Bug: user didn't check "unlimited per user" but 0 would send unlimited to API
		const result = createPromoCodeFormSchema.safeParse({
			...VALID_BASE,
			unlimitedPerUser: false,
			maxRedemptionsPerUser: 0,
		});
		expect(result.success).toBe(false);
	});
});
