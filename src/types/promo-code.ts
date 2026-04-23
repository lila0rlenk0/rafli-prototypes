import { z } from 'zod';

/** Allowed characters in promo codes (excludes ambiguous O/0/I/1) */
export const PROMO_CODE_REGEX = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export const PROMO_CODE_TYPE = {
	FREE_TICKETS: 'free_tickets',
	DISCOUNT_FIXED: 'discount_fixed',
	DISCOUNT_PERCENT: 'discount_percent',
} as const;

export const PROMO_CODE_STATUS = {
	ACTIVE: 'active',
	INACTIVE: 'inactive',
	EXPIRED: 'expired',
	EXHAUSTED: 'exhausted',
} as const;

export type PromoCodeType =
	(typeof PROMO_CODE_TYPE)[keyof typeof PROMO_CODE_TYPE];
export type PromoCodeStatus =
	(typeof PROMO_CODE_STATUS)[keyof typeof PROMO_CODE_STATUS];

export const promoCodeTypeSchema = z.enum([
	PROMO_CODE_TYPE.FREE_TICKETS,
	PROMO_CODE_TYPE.DISCOUNT_FIXED,
	PROMO_CODE_TYPE.DISCOUNT_PERCENT,
]);

/**
 * Promo code entity from backend.
 *
 * Validation boundary: server-side — parsed in promo code server actions.
 * `bulkId` defaults to null for backward compat with older payloads.
 * `maxRedemptionsPerUser` defaults to 0 (unlimited) for the same reason.
 */
export const promoCodeSchema = z.object({
	id: z.string(),
	code: z.string(),
	raffleId: z.string(),
	// Backend may omit bulkId for older payloads; normalize to null for UI.
	bulkId: z.uuidv7().nullable().optional().default(null),
	type: promoCodeTypeSchema,
	value: z.string(),
	maxUses: z.number(),
	// 0 = unlimited — same convention as maxUses
	maxRedemptionsPerUser: z.number().default(0),
	usedCount: z.number(),
	isActive: z.boolean(),
	expiresAt: z.string().nullable(),
	createdAt: z.string(),
});

export const listPromoCodesResponseSchema = z.object({
	items: z.array(promoCodeSchema),
	limit: z.number(),
	offset: z.number(),
	total: z.number(),
});

/** XXXX-XXXX format — transforms to uppercase then validates */
export const promoCodeStringSchema = z
	.preprocess(
		value => (typeof value === 'string' ? value.trim().toUpperCase() : value),
		z.string().length(9),
	)
	.refine(v => PROMO_CODE_REGEX.test(v), 'Invalid promo code format');

export const exportPromoCodesQuerySchema = z.object({
	bulkId: z.uuidv7().optional(),
	include: z.enum(['all', 'redeemed', 'unredeemed']).default('all'),
	status: z.enum(['all', 'active', 'inactive']).default('all'),
	type: z
		.enum([
			'all',
			PROMO_CODE_TYPE.FREE_TICKETS,
			PROMO_CODE_TYPE.DISCOUNT_FIXED,
			PROMO_CODE_TYPE.DISCOUNT_PERCENT,
		])
		.default('all'),
});

export type PromoCode = z.infer<typeof promoCodeSchema>;
export type ListPromoCodesResponse = z.infer<
	typeof listPromoCodesResponseSchema
>;
export type ExportPromoCodesQuery = z.infer<typeof exportPromoCodesQuerySchema>;

export const bulkCreatePromoCodesInputSchema = z
	.object({
		count: z.number().int().min(1).max(100),
		type: promoCodeTypeSchema,
		value: z.number().positive(),
		maxUses: z.number().int().min(0).max(10_000).default(1),
		// 0 = unlimited — mirrors maxUses convention
		maxRedemptionsPerUser: z.number().int().min(0).max(10_000).default(0),
		expiresAt: z.string().optional(),
	})
	.refine(
		data => {
			if (data.type === PROMO_CODE_TYPE.DISCOUNT_PERCENT) {
				return data.value >= 1 && data.value <= 100;
			}
			return true;
		},
		{ message: 'Discount percent must be between 1 and 100', path: ['value'] },
	)
	.refine(
		data => {
			if (data.type === PROMO_CODE_TYPE.FREE_TICKETS) {
				return Number.isInteger(data.value) && data.value >= 1;
			}
			return true;
		},
		{
			message: 'Bonus entries count must be a positive integer',
			path: ['value'],
		},
	);

export const bulkCreatePromoCodesResponseSchema = z.object({
	bulkId: z.uuidv7(),
	created: z.number(),
	codes: z.array(z.string()),
});

export type BulkCreatePromoCodesInput = z.infer<
	typeof bulkCreatePromoCodesInputSchema
>;
export type BulkCreatePromoCodesResponse = z.infer<
	typeof bulkCreatePromoCodesResponseSchema
>;

/**
 * Backend returns different fields based on promo type:
 * - free_tickets: { valid, type, ticketsGranted }
 * - discount_*: { valid, type, discountAmount }
 */
export const validatePromoCodeResponseSchema = z.object({
	// BE always throws on invalid codes (never returns valid: false), but the
	// interface declares `boolean`. Using z.boolean() hardens against future
	// BE changes where valid: false is returned instead of an error.
	valid: z.boolean(),
	type: promoCodeTypeSchema,
	discountAmount: z.string().optional(),
	ticketsGranted: z.number().optional(),
});

export type ValidatePromoCodeResponse = z.infer<
	typeof validatePromoCodeResponseSchema
>;

/**
 * Schema for validated promo code used by frontend components after validation
 *
 * Value interpretation by type:
 * - free_tickets: number of free tickets (e.g., "3")
 * - discount_percent: per-ticket discount amount in currency (e.g., "5.00")
 * - discount_fixed: total fixed discount amount (e.g., "10.00")
 */
export const validatedPromoCodeSchema = z.object({
	valid: z.literal(true),
	code: z.string(),
	type: promoCodeTypeSchema,
	value: z.string(),
});

export type ValidatedPromoCode = z.infer<typeof validatedPromoCodeSchema>;
