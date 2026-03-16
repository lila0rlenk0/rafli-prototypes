import { z } from 'zod';

import { orderStatusSchema } from './order';
import { cryptoPaymentStatusSchema, paymentStatusSchema } from './payment';

// ==========================================
// Constants
// ==========================================

/**
 * Checkout lifecycle phases — backend unifies order + session state into a single phase.
 * Replaces FE's multi-endpoint hydration (getOrder + getCryptoSession + guards).
 *
 * Must match BE `CheckoutPhase` exactly: 'awaiting_payment' | 'completed' | 'confirming' | 'failed'.
 *
 * State transitions (BE-authoritative, derived from order + session state):
 *   awaiting_payment → confirming  (crypto tx hash submitted via POST /payments/crypto/submit)
 *   awaiting_payment → completed   (Stripe webhook confirms, or $0 promo auto-completes order)
 *   awaiting_payment → failed      (session expires, order cancelled, or abandon)
 *   confirming       → completed   (on-chain confirmations reach target, verified by cron or FE confirm)
 *   confirming       → failed      (tx reverted, wrong amount, or confirm deadline exceeded)
 *   completed and failed are terminal — no further transitions.
 *
 * Note: BE maps `refunded` orders to `failed` phase (see get-checkout-status.query.ts).
 * FE can distinguish via `orderStatus === 'refunded'` when needed for display copy.
 */
export const CHECKOUT_PHASE = {
	/** Order created, no payment session yet or session pending */
	AWAITING_PAYMENT: 'awaiting_payment',
	/** Crypto tx submitted, awaiting on-chain confirmations */
	CONFIRMING: 'confirming',
	/** Payment verified and order completed */
	COMPLETED: 'completed',
	/** Payment failed, session expired, or order cancelled */
	FAILED: 'failed',
} as const;

/** Union of checkout lifecycle phases — derived from CHECKOUT_PHASE constant. */
export type CheckoutPhase =
	(typeof CHECKOUT_PHASE)[keyof typeof CHECKOUT_PHASE];

// ==========================================
// Schemas
// ==========================================

// Sub-schemas — not exported; composed into checkoutStatusSchema only.

/**
 * Schema for the unified checkout status endpoint.
 * GET /payments/checkout-status/:orderId returns a single object that
 * merges order state, session state, and actionability flags.
 *
 * Replaces the FE's guard functions (getReviewSessionGuard,
 * getPaySessionRevalidationDecision, resolveCheckoutHydrationDecision)
 * with backend-authoritative decisions.
 */
const checkoutStatusStripeSchema = z.object({
	expiresAt: z.string(),
	id: z.string(),
	isActive: z.boolean(),
	status: paymentStatusSchema,
	stripeSessionId: z.string(),
});

const checkoutStatusCryptoSchema = z.object({
	blockConfirmations: z.number(),
	chainId: z.number(),
	confirmationTarget: z.number(),
	confirmDeadline: z.string(),
	expiresAt: z.string(),
	/** BE column is `varchar(500)` — may need display-time truncation for edge cases. */
	failureReason: z.string().nullable(),
	id: z.string(),
	isActive: z.boolean(),
	status: cryptoPaymentStatusSchema,
	submitDeadline: z.string(),
	txHash: z.string().nullable(),
});

export const checkoutStatusSchema = z.object({
	/** Which payment method still owns the pending order */
	activeMethod: z.enum(['crypto', 'none', 'stripe']),
	/** Whether user can retry payment (new session) from this state */
	canRetry: z.boolean(),
	/** Whether user can switch payment method (Stripe ↔ crypto) */
	canSwitchMethod: z.boolean(),
	/** Latest crypto session snapshot — null if crypto was never opened */
	crypto: checkoutStatusCryptoSchema.nullable(),
	orderId: z.string(),
	orderStatus: orderStatusSchema,
	/** Current lifecycle phase — drives FE step rendering */
	phase: z.enum([
		CHECKOUT_PHASE.AWAITING_PAYMENT,
		CHECKOUT_PHASE.CONFIRMING,
		CHECKOUT_PHASE.COMPLETED,
		CHECKOUT_PHASE.FAILED,
	]),
	/** Latest Stripe session snapshot — null if Stripe was never opened */
	stripe: checkoutStatusStripeSchema.nullable(),
});

// ==========================================
// Inferred Types
// ==========================================

/** Unified checkout status from GET /payments/checkout-status/:orderId. */
export type CheckoutStatus = z.infer<typeof checkoutStatusSchema>;
