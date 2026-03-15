import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

export const PAYMENT_STATUS = {
	PENDING: 'pending',
	COMPLETED: 'completed',
	FAILED: 'failed',
	EXPIRED: 'expired',
} as const;

// ==========================================
// Types from Constants
// ==========================================

/**
 * Represents the status of a payment session
 */
export type PaymentStatus =
	(typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// ==========================================
// Schemas
// ==========================================

/**
 * Zod schema for PaymentStatus
 */
export const paymentStatusSchema = z.enum([
	PAYMENT_STATUS.PENDING,
	PAYMENT_STATUS.COMPLETED,
	PAYMENT_STATUS.FAILED,
	PAYMENT_STATUS.EXPIRED,
]);

/**
 * Schema for payment session from backend (matches BE PaymentSessionResponseDto).
 * Removed fields that BE doesn't send: raffleId, ticketQuantity, stripePaymentIntentId, updatedAt.
 */
export const paymentSessionSchema = z.object({
	id: z.uuid(),
	orderId: z.uuid(),
	userId: z.string(),
	stripeSessionId: z.string(),
	amount: z.string(), // Decimal as string
	currency: z.string().length(3),
	status: paymentStatusSchema,
	completedAt: z.string().nullable().optional(),
	expiresAt: z.string(),
	createdAt: z.string(),
});

/**
 * Schema for checkout session response (matches BE CheckoutSessionResponseDto).
 * `previousSessionCancelled` indicates BE auto-cancelled a stale/incompatible session.
 * `expiresAt` is the Stripe session expiration timestamp.
 */
export const checkoutSessionResponseSchema = z.object({
	id: z.uuid(), // Payment session ID
	checkoutUrl: z.url(),
	orderId: z.uuid(),
	expiresAt: z.string(),
	previousSessionCancelled: z.boolean(),
});

/**
 * Schema for creating checkout session (request payload).
 * `publicSlug` is FE-only — used for URL construction, not sent to BE.
 * BE accepts only { orderId, successUrl, cancelUrl }.
 */
export const createCheckoutPayloadSchema = z.object({
	orderId: z.uuid(),
	publicSlug: z.string().min(1),
});

// ==========================================
// Inferred Types
// ==========================================

export type PaymentSession = z.infer<typeof paymentSessionSchema>;
export type CheckoutSessionResponse = z.infer<
	typeof checkoutSessionResponseSchema
>;
export type CreateCheckoutPayload = z.infer<typeof createCheckoutPayloadSchema>;

// ==========================================
// Crypto Payment
// ==========================================

/**
 * Status values for crypto payment sessions — must match backend CryptoSessionStatus.
 * Backend enum: pending → confirming → completed | failed
 * Note: 'expired' does not exist as a session status — backend moves expired sessions to 'failed'.
 */
export const CRYPTO_PAYMENT_STATUS = {
	/** Session created, awaiting tx hash submission via POST /crypto/submit */
	PENDING: 'pending',
	/** tx hash submitted, awaiting on-chain confirmations */
	CONFIRMING: 'confirming',
	/** Payment verified and order completed */
	COMPLETED: 'completed',
	/** Payment failed (reverted, expired, or verification error) */
	FAILED: 'failed',
} as const;

export type CryptoPaymentStatus =
	(typeof CRYPTO_PAYMENT_STATUS)[keyof typeof CRYPTO_PAYMENT_STATUS];

/**
 * Zod schema for backend CryptoSessionStatus enum — single source of truth.
 * Used by service actions that validate session-related API responses.
 */
export const cryptoPaymentStatusSchema = z.enum([
	CRYPTO_PAYMENT_STATUS.PENDING,
	CRYPTO_PAYMENT_STATUS.CONFIRMING,
	CRYPTO_PAYMENT_STATUS.COMPLETED,
	CRYPTO_PAYMENT_STATUS.FAILED,
]);
