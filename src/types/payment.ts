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
 * Schema for payment session from backend
 */
export const paymentSessionSchema = z.object({
	id: z.uuid(),
	orderId: z.uuid(),
	raffleId: z.uuid(),
	userId: z.string(),
	stripeSessionId: z.string(),
	stripePaymentIntentId: z.string().nullable().optional(),
	amount: z.string(), // Decimal as string
	currency: z.string().length(3),
	ticketQuantity: z.number().int().positive(),
	status: paymentStatusSchema,
	completedAt: z.string().nullable().optional(),
	expiresAt: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/**
 * Schema for checkout session response
 */
export const checkoutSessionResponseSchema = z.object({
	id: z.uuid(), // Payment session ID
	checkoutUrl: z.url(),
	orderId: z.uuid(),
});

/**
 * Schema for creating checkout session (request payload)
 */
export const createCheckoutPayloadSchema = z.object({
	orderId: z.uuid(),
	raffleId: z.uuid(),
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
 * Status values for crypto payment sessions
 */
export const CRYPTO_PAYMENT_STATUS = {
	AWAITING_TX: 'awaiting_tx',
	CONFIRMING: 'confirming',
	COMPLETED: 'completed',
	FAILED: 'failed',
	EXPIRED: 'expired',
} as const;

export type CryptoPaymentStatus =
	(typeof CRYPTO_PAYMENT_STATUS)[keyof typeof CRYPTO_PAYMENT_STATUS];
