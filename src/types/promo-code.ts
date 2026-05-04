import { z } from 'zod';

// BE bearer-token grammar (mirrors `promoCodeFieldSchema` in
// `raffles-core-backend/src/shared/schemas.ts`). The validator is intentionally
// loose because multiple generators emit different canonical shapes and the
// shared validator must accept all of them:
//   - `XXXX-XXXX` — host/admin codes (charset A-Z2-9, 9 chars)
//   - `FIRSTDRAW-A7X9K2` — sequence-gated drip codes (variable length)
//   - `MAX-12345678-ABCDEF` — Earnmax migration credit grants (19 chars)
// DB UNIQUE on `promo_codes.code` is the source of truth — unknown shapes
// simply miss. Tightening the regex to a specific shape would force a
// shared-validator change every time a new generator ships, fanning out
// blast radius across both repos.
export const PROMO_CODE_MIN_LENGTH = 8;
export const PROMO_CODE_MAX_LENGTH = 32;

/**
 * Bearer-token charset — uppercase A-Z, digits 0-9, and dashes. Mirrors
 * `PROMO_CODE_CHARSET` in the backend schemas file. Does NOT exclude
 * O/0/I/1 (the legacy host-code generator excludes those, but other
 * generators don't, so the shared validator must allow the full set).
 */
export const PROMO_CODE_REGEX = /^[A-Z0-9-]+$/;

// Earnmax migration prefix — see `EARNMAX_MIGRATION.csv` and the
// `MAX-12345678-ABCDEF` example in the backend schema docblock. Used by the
// redemption success dialog to swap copy to the Earnmax welcome variant
// without a round-trip to the BE — `/promo-codes/redeem` doesn't return a
// tier discriminator, only `{ creditsGranted, balanceAfter }`. The trailing
// dash is part of the prefix so a host code starting with letters `MAX`
// (e.g. `MAXX-ABCD`) doesn't accidentally trip the Earnmax branch.
export const EARNMAX_PROMO_CODE_PREFIX = 'MAX-';

/**
 * True when the code is an Earnmax migration credit grant. Used by the
 * redemption success dialog to render the Earnmax welcome copy instead of
 * the generic "code redeemed" message. Comparison is case-insensitive
 * because the input pipeline uppercases at the boundary, but a stale value
 * coming from cached state could still be lower-cased.
 *
 * @param code - Promo code in canonical or unnormalized form.
 * @returns Whether the code starts with the Earnmax migration prefix.
 */
export function isEarnmaxPromoCode(code: string): boolean {
	return code.trim().toUpperCase().startsWith(EARNMAX_PROMO_CODE_PREFIX);
}

export const PROMO_CODE_TYPE = {
	FREE_TICKETS: 'free_tickets',
	DISCOUNT_FIXED: 'discount_fixed',
	DISCOUNT_PERCENT: 'discount_percent',
	// Account-scoped grant: redeems platform credits onto the user's balance.
	// Unlike the other three, the redeem call must NOT carry raffleId / orderId —
	// the backend rejects mismatched payloads with `global:validation:invalid-payload`.
	CREDIT_GRANT: 'credit_grant',
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
	PROMO_CODE_TYPE.CREDIT_GRANT,
]);

/**
 * Raffle-scoped subset of promo types — every type bound to a raffle row
 * (host create form, host listing, validate endpoint, checkout discount
 * math). `credit_grant` is account-scoped and never appears on these
 * surfaces, so excluding it from these schemas keeps the host UI's
 * exhaustive switches honest without forcing dead "what if a credit grant
 * showed up here?" branches.
 */
export const raffleScopedPromoCodeTypeSchema = z.enum([
	PROMO_CODE_TYPE.FREE_TICKETS,
	PROMO_CODE_TYPE.DISCOUNT_FIXED,
	PROMO_CODE_TYPE.DISCOUNT_PERCENT,
]);

export type RaffleScopedPromoCodeType = z.infer<
	typeof raffleScopedPromoCodeTypeSchema
>;

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
	// Host listing only ever returns raffle-scoped types — credit grants are
	// account-scoped and surfaced via the admin endpoints, never via the host
	// list. Narrow on the wire keeps `formatPromoCodeValue`'s switch exhaustive
	// without a dead `credit_grant` branch.
	type: raffleScopedPromoCodeTypeSchema,
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

/**
 * Bearer-token validator for promo codes — mirrors `promoCodeFieldSchema` in
 * `raffles-core-backend/src/shared/schemas.ts`. The BE intentionally validates
 * grammar only (no canonical-shape regex) because multiple generators emit
 * different shapes; see the docblock on `PROMO_CODE_REGEX` above for the
 * rationale.
 *
 * Deviation from the BE: this preprocessor uppercases input. The BE
 * deliberately omits `.toUpperCase()` to surface lowercase input as a 400
 * (preserving case as a meaningful axis if a future generator uses
 * mixed-case encodings). The FE upper-cases as a UX convenience — users
 * type in any case, see the visual `text-transform: uppercase`, and we send
 * the canonicalized form. If a mixed-case generator ever ships, drop the
 * preprocess here and surface "fix your input" inline like the BE does.
 */
export const promoCodeStringSchema = z
	.preprocess(
		value => (typeof value === 'string' ? value.trim().toUpperCase() : value),
		z.string().min(PROMO_CODE_MIN_LENGTH).max(PROMO_CODE_MAX_LENGTH),
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
	// Validate endpoint requires `raffleId` so it can never resolve a
	// credit-grant code — narrow the wire type to keep downstream switch
	// exhaustiveness intact (see `getPromoCodeDescription`).
	type: raffleScopedPromoCodeTypeSchema,
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
	// Same narrowing as `validatePromoCodeResponseSchema` above — this is the
	// FE's post-validate state for raffle-scoped checkout flows; credit grants
	// never reach validation.
	type: raffleScopedPromoCodeTypeSchema,
	value: z.string(),
	rawValue: z.string(),
});

export type ValidatedPromoCode = z.infer<typeof validatedPromoCodeSchema>;
