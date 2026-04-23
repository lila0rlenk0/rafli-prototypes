import { z } from 'zod';

import { PROMO_CODE_TYPE, type PromoCodeType } from '@/types/promo-code';

/**
 * Form schema for creating promo codes.
 * Exported for unit testing and consumption by the sibling form + modal
 * components. All cross-field invariants live here so the form body
 * renders are purely visual.
 */
export const createPromoCodeFormSchema = z
	.object({
		count: z.number().int().min(1).max(100),
		type: z.enum([
			PROMO_CODE_TYPE.FREE_TICKETS,
			PROMO_CODE_TYPE.DISCOUNT_FIXED,
			PROMO_CODE_TYPE.DISCOUNT_PERCENT,
		]),
		value: z.number().positive('Value must be positive'),
		unlimitedUses: z.boolean(),
		maxUses: z.number().int().min(0).max(10_000),
		unlimitedPerUser: z.boolean(),
		maxRedemptionsPerUser: z.number().int().min(0).max(10_000),
		noExpiration: z.boolean(),
		expiresAt: z.string().optional(),
	})
	.refine(
		data => {
			if (data.type === PROMO_CODE_TYPE.DISCOUNT_PERCENT) {
				return data.value >= 1 && data.value <= 100;
			}
			return true;
		},
		{ message: 'Percentage must be between 1 and 100', path: ['value'] },
	)
	.refine(
		data => {
			if (data.type === PROMO_CODE_TYPE.FREE_TICKETS) {
				return Number.isInteger(data.value);
			}
			return true;
		},
		{ message: 'Bonus entries must be a whole number', path: ['value'] },
	)
	.refine(
		data => {
			if (data.noExpiration) return true;
			return !!data.expiresAt;
		},
		{ message: 'Expiration date is required', path: ['expiresAt'] },
	)
	// Prevent 0 (API's "unlimited" convention) when the user didn't check unlimited.
	.refine(data => data.unlimitedUses || data.maxUses >= 1, {
		message: 'Max uses must be at least 1',
		path: ['maxUses'],
	})
	.refine(data => data.unlimitedPerUser || data.maxRedemptionsPerUser >= 1, {
		message: 'Max redemptions per user must be at least 1',
		path: ['maxRedemptionsPerUser'],
	});

export type CreatePromoCodeFormData = z.infer<typeof createPromoCodeFormSchema>;

/** Normalized payload handed to the `onCreate` callback. */
export interface CreatePromoCodePayload {
	count: number;
	type: PromoCodeType;
	value: number;
	maxUses: number;
	maxRedemptionsPerUser: number;
	expiresAt?: string;
}

/**
 * Converts a `YYYY-MM-DD` date picker string into an ISO timestamp
 * pinned to the local end-of-day. Kept as a pure helper so the form
 * body stays focused on rendering.
 *
 * @returns End-of-day ISO timestamp for the supplied calendar day.
 */
export function toLocalEndOfDayIso(dateString: string): string {
	const [year, month, day] = dateString.split('-').map(Number);
	const localEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
	return localEndOfDay.toISOString();
}
