import { z } from 'zod';

/**
 * Credit ledger entry types — direction is implied:
 * - grant/reversal: increases balance
 * - spend: decreases balance
 */
export const CREDIT_ENTRY_TYPE = {
	GRANT: 'grant',
	SPEND: 'spend',
	REVERSAL: 'reversal',
} as const;

/** Business reasons for credit mutations — matches BE CreditReason enum. */
export const CREDIT_REASON = {
	ADMIN_GRANT: 'admin_grant',
	CANCELLATION_REFUND: 'cancellation_refund',
	CHECKOUT_SPEND: 'checkout_spend',
	ORDER_REVERSAL: 'order_reversal',
	SUBSCRIPTION_RENEWAL: 'subscription_renewal',
} as const;

export type CreditEntryType =
	(typeof CREDIT_ENTRY_TYPE)[keyof typeof CREDIT_ENTRY_TYPE];

export type CreditReason = (typeof CREDIT_REASON)[keyof typeof CREDIT_REASON];

export const creditEntryTypeSchema = z.enum([
	CREDIT_ENTRY_TYPE.GRANT,
	CREDIT_ENTRY_TYPE.SPEND,
	CREDIT_ENTRY_TYPE.REVERSAL,
]);

export const creditReasonSchema = z.enum([
	CREDIT_REASON.ADMIN_GRANT,
	CREDIT_REASON.CANCELLATION_REFUND,
	CREDIT_REASON.CHECKOUT_SPEND,
	CREDIT_REASON.ORDER_REVERSAL,
	CREDIT_REASON.SUBSCRIPTION_RENEWAL,
]);

/**
 * Schema for GET /api/v1/me/credits response.
 * All amounts are decimal strings with 4-digit precision from the BE.
 */
export const creditBalanceResponseSchema = z.object({
	availableAmount: z.string(),
	totalGranted: z.string(),
	totalSpent: z.string(),
});

/** Matches BE CreditHistoryEntryDto. */
export const creditHistoryEntrySchema = z.object({
	id: z.number(),
	type: creditEntryTypeSchema,
	amount: z.string(),
	balanceAfter: z.string(),
	reason: creditReasonSchema,
	referenceId: z.string().nullable(),
	referenceType: z.string().nullable(),
	createdAt: z.string(),
});

/**
 * Schema for GET /api/v1/me/credits/history response.
 * Paginated list of credit ledger entries (newest first).
 */
export const creditHistoryResponseSchema = z.object({
	entries: z.array(creditHistoryEntrySchema),
	limit: z.number(),
	page: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

/**
 * Schema for POST /api/v1/payments/credits/pay response.
 * Instant payment — no polling needed.
 */
export const spendCreditsResponseSchema = z.object({
	balanceAfter: z.string(),
	success: z.boolean(),
});

export type CreditBalanceResponse = z.infer<typeof creditBalanceResponseSchema>;
export type CreditHistoryEntry = z.infer<typeof creditHistoryEntrySchema>;
export type CreditHistoryResponse = z.infer<typeof creditHistoryResponseSchema>;
export type SpendCreditsResponse = z.infer<typeof spendCreditsResponseSchema>;

/** Query params for credit history endpoint. */
export const creditHistoryQuerySchema = z.object({
	page: z.number().optional(),
	limit: z.number().optional(),
});

export type CreditHistoryQuery = z.infer<typeof creditHistoryQuerySchema>;
