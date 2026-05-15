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
	// Stripe-issued dispute chargeback — BE clawback inserted as a spend so the
	// maintain_credit_balance trigger nets it out against the user's available
	// balance. Shows up on a buyer's ledger when an upstream chargeback fires
	// after the renewal credits were already granted.
	DISPUTE_CHARGEBACK: 'dispute_chargeback',
	// Fanbasis hosted-checkout grant — the public-credit webhook subscriber
	// inserts this row after the buyer pays for the credit-purchase landing
	// offer. Idempotency key is the upstream `payment_id`.
	FANBASIS_PUBLIC_CREDIT: 'fanbasis_public_credit',
	ORDER_REVERSAL: 'order_reversal',
	// Credit-grant promo redemption — the BE writes ledger rows with this reason
	// from `RedeemPromoCodeCommand` after a credit_grant code is redeemed. Without
	// this entry the credit-history Zod parse rejects post-redeem rows and surfaces
	// `captureContractDrift` for every newly-issued credit grant.
	PROMO_REDEMPTION: 'promo_redemption',
	// Revenue-share payout — granted by the winnings subscriber when a raffle
	// runs with payoutMode='revenue_share' (threshold misses). One grant per
	// winning position.
	RAFFLE_REVENUE_SHARE: 'raffle_revenue_share',
	// Referral programme grant — issued when a referred user completes the
	// activation event tracked BE-side.
	REFERRAL_GRANT: 'referral_grant',
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
	CREDIT_REASON.DISPUTE_CHARGEBACK,
	CREDIT_REASON.FANBASIS_PUBLIC_CREDIT,
	CREDIT_REASON.ORDER_REVERSAL,
	CREDIT_REASON.PROMO_REDEMPTION,
	CREDIT_REASON.RAFFLE_REVENUE_SHARE,
	CREDIT_REASON.REFERRAL_GRANT,
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
