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
 */
const promoCodeSchema = z.object({
	id: z.string(),
	code: z.string(),
	raffleId: z.string(),
	bulkId: z.uuidv7().nullable(),
	type: promoCodeTypeSchema,
	value: z.string(),
	maxUses: z.number(),
	// 0 = unlimited — same convention as maxUses
	maxRedemptionsPerUser: z.number(),
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

export const bulkCreatePromoCodesResponseSchema = z.object({
	bulkId: z.uuidv7(),
	created: z.number(),
	codes: z.array(z.string()),
});

export type BulkCreatePromoCodesResponse = z.infer<
	typeof bulkCreatePromoCodesResponseSchema
>;

/**
 * Backend returns different fields based on promo type:
 * - free_tickets: { valid, type, ticketsGranted, rawValue }
 * - discount_*: { valid, type, discountAmount, rawValue }
 *
 * `rawValue` is the unmodified `promoCode.value` decimal string. Required so
 * the FE can mirror BE math at the order-total level (e.g. fixed-promo cap
 * across qty > 1) — the per-ticket-capped `discountAmount` would otherwise
 * understate savings the BE actually applies.
 *
 * `valid` is `literal(true)`: the BE throws on invalid codes (never returns a
 * `false` payload), and the FE service action only ever sees a successful
 * response here. A future BE change that surfaces `valid: false` instead of
 * an error would land as a Zod parse failure → ContractDrift toast, which is
 * the correct loud failure mode rather than a silent UX downgrade.
 */
export const validatePromoCodeResponseSchema = z.object({
	valid: z.literal(true),
	type: promoCodeTypeSchema,
	discountAmount: z.string().optional(),
	rawValue: z.string(),
	ticketsGranted: z.number().optional(),
});

export type ValidatePromoCodeResponse = z.infer<
	typeof validatePromoCodeResponseSchema
>;

/**
 * Schema for validated promo code used by frontend components after validation.
 *
 * `value` is the BE-computed per-ticket display label (subscriber-aware) — kept
 * for UI copy ("$1.875 off per entry") that matches the user's effective price.
 * `rawValue` is the unmodified host-set promo value used by all checkout math
 * (subscriber-aware unit math + order-level cap math); see schema above.
 *
 * Value interpretation by type:
 * - free_tickets: `value` = grant count display, `rawValue` = grant count decimal string
 * - discount_percent: `value` = per-ticket dollar preview, `rawValue` = percent (1-100)
 * - discount_fixed: `value` = per-ticket-capped preview, `rawValue` = total dollar amount
 */
export const validatedPromoCodeSchema = z.object({
	valid: z.literal(true),
	code: z.string(),
	type: promoCodeTypeSchema,
	value: z.string(),
	rawValue: z.string(),
});

export type ValidatedPromoCode = z.infer<typeof validatedPromoCodeSchema>;
