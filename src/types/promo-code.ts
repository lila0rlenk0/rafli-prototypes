import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

/**
 * Allowed characters in promo codes (excludes ambiguous O/0/I/1)
 */
export const PROMO_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Regex pattern for promo code format: XXXX-XXXX (8 chars + hyphen)
 */
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

// ==========================================
// Types from Constants
// ==========================================

export type PromoCodeType = (typeof PROMO_CODE_TYPE)[keyof typeof PROMO_CODE_TYPE];
export type PromoCodeStatus =
	(typeof PROMO_CODE_STATUS)[keyof typeof PROMO_CODE_STATUS];

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for promo code type enum
 */
export const promoCodeTypeSchema = z.enum([
	PROMO_CODE_TYPE.FREE_TICKETS,
	PROMO_CODE_TYPE.DISCOUNT_FIXED,
	PROMO_CODE_TYPE.DISCOUNT_PERCENT,
]);

/**
 * Schema for promo code response from backend
 */
export const promoCodeSchema = z.object({
	id: z.string(),
	code: z.string(),
	raffleId: z.string(),
	// Backend may omit bulkId for older payloads; normalize to null for UI.
	bulkId: z.string().uuid().nullable().optional().default(null),
	type: promoCodeTypeSchema,
	value: z.string(),
	maxUses: z.number(),
	usedCount: z.number(),
	isActive: z.boolean(),
	expiresAt: z.string().nullable(),
	createdAt: z.string(),
});

/**
 * Schema for list promo codes response (offset-based pagination)
 */
export const listPromoCodesResponseSchema = z.object({
	items: z.array(promoCodeSchema),
	limit: z.number(),
	offset: z.number(),
	total: z.number(),
});

/**
 * Schema for promo code string input (XXXX-XXXX format)
 * Transforms to uppercase and validates format
 */
export const promoCodeStringSchema = z
	.preprocess(
		value =>
			typeof value === 'string' ? value.trim().toUpperCase() : value,
		z.string().length(9),
	)
	.refine(v => PROMO_CODE_REGEX.test(v), 'Invalid promo code format');

/**
 * Schema for export promo codes query params
 */
export const exportPromoCodesQuerySchema = z.object({
	bulkId: z.string().uuid().optional(),
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

// ==========================================
// Inferred Types
// ==========================================

export type PromoCode = z.infer<typeof promoCodeSchema>;
export type ListPromoCodesResponse = z.infer<typeof listPromoCodesResponseSchema>;
export type ExportPromoCodesQuery = z.infer<typeof exportPromoCodesQuerySchema>;

// ==========================================
// Bulk Creation Schemas
// ==========================================

/**
 * Schema for bulk creating promo codes
 */
export const bulkCreatePromoCodesInputSchema = z
	.object({
		count: z.number().int().min(1).max(100),
		type: promoCodeTypeSchema,
		value: z.number().positive(),
		maxUses: z.number().int().min(0).max(10_000).default(1),
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
			message: 'Free tickets count must be a positive integer',
			path: ['value'],
		},
	);

/**
 * Schema for bulk create response
 */
export const bulkCreatePromoCodesResponseSchema = z.object({
	bulkId: z.string().uuid(),
	created: z.number(),
	codes: z.array(z.string()),
});

export type BulkCreatePromoCodesInput = z.infer<typeof bulkCreatePromoCodesInputSchema>;
export type BulkCreatePromoCodesResponse = z.infer<typeof bulkCreatePromoCodesResponseSchema>;

// ==========================================
// Utilities
// ==========================================

/**
 * Derives display status from promo code data
 * Backend stores isActive flag, but display status depends on expiry and usage
 *
 * @param code - Promo code object
 * @returns Computed display status
 */
export function getPromoCodeStatus(code: PromoCode): PromoCodeStatus {
	if (!code.isActive) {
		return PROMO_CODE_STATUS.INACTIVE;
	}

	if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
		return PROMO_CODE_STATUS.EXPIRED;
	}

	if (code.maxUses > 0 && code.usedCount >= code.maxUses) {
		return PROMO_CODE_STATUS.EXHAUSTED;
	}

	return PROMO_CODE_STATUS.ACTIVE;
}

/**
 * Formats promo code value for display
 *
 * @param code - Promo code object
 * @returns Formatted value string
 */
export function formatPromoCodeValue(code: PromoCode): string {
	const value = parseFloat(code.value);

	switch (code.type) {
		case PROMO_CODE_TYPE.FREE_TICKETS:
			return `${Math.floor(value)} ticket${value !== 1 ? 's' : ''}`;
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return `$${value.toFixed(2)}`;
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			return `${Math.floor(value)}%`;
		default:
			return code.value;
	}
}

/**
 * Formats usage count for display
 *
 * @param code - Promo code object
 * @returns Formatted usage string (e.g., "5/100" or "5/∞")
 */
export function formatPromoCodeUsage(code: PromoCode): string {
	const maxDisplay = code.maxUses === 0 ? '∞' : code.maxUses.toString();
	return `${code.usedCount}/${maxDisplay}`;
}

// ==========================================
// Validation Schemas (Participant Flow)
// ==========================================

/**
 * Schema for backend validation response
 * Backend returns different fields based on promo type:
 * - free_tickets: { valid, type, ticketsGranted }
 * - discount_*: { valid, type, discountAmount }
 */
export const validatePromoCodeResponseSchema = z.object({
	valid: z.literal(true),
	type: promoCodeTypeSchema,
	discountAmount: z.string().optional(),
	ticketsGranted: z.number().optional(),
});

export type ValidatePromoCodeResponse = z.infer<typeof validatePromoCodeResponseSchema>;

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

/**
 * Gets human-readable description for a validated promo code
 *
 * Note: For discount_percent, backend returns per-ticket discount amount
 * (not the percentage), so we show it as a per-ticket discount.
 *
 * @param promo - Validated promo code
 * @returns Description string for display
 */
export function getPromoCodeDescription(promo: ValidatedPromoCode): string {
	const value = parseFloat(promo.value);

	switch (promo.type) {
		case PROMO_CODE_TYPE.FREE_TICKETS:
			return `${Math.floor(value)} free ticket${value !== 1 ? 's' : ''}`;
		case PROMO_CODE_TYPE.DISCOUNT_FIXED:
			return `$${value.toFixed(2)} off your order`;
		case PROMO_CODE_TYPE.DISCOUNT_PERCENT:
			// Backend returns per-ticket discount amount, not percentage
			return `$${value.toFixed(2)} off per ticket`;
		default:
			return 'Discount applied';
	}
}
