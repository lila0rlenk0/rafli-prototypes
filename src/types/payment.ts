import { z } from 'zod';

/**
 * Stripe payment session statuses — BE-authoritative.
 *
 * State transitions (matches BE payment_sessions table):
 *   pending   → completed  (Stripe webhook `checkout.session.completed` fires)
 *   pending   → expired    (Stripe session TTL exceeded, webhook `checkout.session.expired`)
 *   pending   → failed     (payment attempt failed — card declined, etc.)
 *   expired   → completed  (cancel-race recovery: webhook arrives after FE sees expiry)
 *   completed and failed are terminal.
 */
export const PAYMENT_STATUS = {
	PENDING: 'pending',
	COMPLETED: 'completed',
	FAILED: 'failed',
	EXPIRED: 'expired',
} as const;

/** Union of Stripe PAYMENT_STATUS values — use instead of raw string literals. */
export type PaymentStatus =
	(typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const paymentStatusSchema = z.enum([
	PAYMENT_STATUS.PENDING,
	PAYMENT_STATUS.COMPLETED,
	PAYMENT_STATUS.FAILED,
	PAYMENT_STATUS.EXPIRED,
]);

/**
 * Schema for payment session from backend (matches BE PaymentSessionResponseDto).
 * Removed fields that BE doesn't send: raffleId, ticketQuantity, stripePaymentIntentId, updatedAt.
 *
 * Validation boundary: server-side — parsed in payment-related server actions.
 */
export const paymentSessionSchema = z.object({
	id: z.uuidv7(),
	orderId: z.uuidv7(),
	userId: z.string(),
	stripeSessionId: z.string(),
	// decimal as string
	amount: z.string(),
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
	// payment session ID
	id: z.uuidv7(),
	checkoutUrl: z.url(),
	orderId: z.uuidv7(),
	expiresAt: z.string(),
	previousSessionCancelled: z.boolean(),
});

/**
 * Schema for creating checkout session (request payload).
 * `publicSlug` is FE-only — used for URL construction, not sent to BE.
 * BE accepts only { orderId, successUrl, cancelUrl }.
 *
 * Validation boundary: client-side — validated before the server action
 * transforms this into the actual BE payload shape.
 */
export const createCheckoutPayloadSchema = z.object({
	orderId: z.uuidv7(),
	publicSlug: z.string().min(1),
});

/** Stripe payment session entity from BE — used in order detail and status checks. */
export type PaymentSession = z.infer<typeof paymentSessionSchema>;
/** Response from POST /payments/checkout — contains Stripe redirect URL. */
export type CheckoutSessionResponse = z.infer<
	typeof checkoutSessionResponseSchema
>;
/** FE payload for creating a Stripe checkout session. `publicSlug` is FE-only for URL construction. */
export type CreateCheckoutPayload = z.infer<typeof createCheckoutPayloadSchema>;

/**
 * Crypto payment session statuses — must match BE `CryptoSessionStatus` enum exactly.
 *
 * State transitions (matches BE crypto_payment_sessions table):
 *   pending    → confirming  (tx hash submitted via POST /payments/crypto/submit)
 *   pending    → failed      (submit deadline exceeded, or user abandoned)
 *   confirming → completed   (on-chain confirmations ≥ target, verified by cron or FE confirm)
 *   confirming → failed      (tx reverted, wrong amount, confirm deadline exceeded)
 *   failed     → confirming  (grace-period reactivation: tx found on-chain after soft failure,
 *                              excludes user_cancelled/user_abandoned failure reasons)
 *   completed is terminal. failed is terminal unless grace-period reactivation applies.
 *
 * Note: 'expired' does not exist as a session status — BE moves expired sessions to 'failed'
 * with failureReason 'session_expired'. No separate expired state in the state machine.
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

/** Union of crypto CRYPTO_PAYMENT_STATUS values — use instead of raw string literals. */
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

/**
 * Shared response schema for crypto tx mutations (submit + confirm).
 * Both endpoints return the same `{ id, status }` shape.
 */
export const cryptoTxMutationResponseSchema = z.object({
	id: z.string(),
	status: cryptoPaymentStatusSchema,
});

/** Response from POST /payments/crypto/submit or /payments/crypto/confirm */
export type CryptoTxMutationResponse = z.infer<
	typeof cryptoTxMutationResponseSchema
>;
