import { z } from 'zod';

import { cryptoPaymentStatusSchema } from './payment';

// ==========================================
// Constants
// ==========================================

/**
 * Order lifecycle statuses — BE-authoritative.
 *
 * State transitions:
 *   pending   → completed  (payment verified via Stripe webhook or crypto on-chain confirmation)
 *   pending   → completed  (direct: $0 promo order, free_tickets promo)
 *   pending   → failed     (payment session expired, abandoned, or verification failed)
 *   completed → refunded   (host-initiated refund — rare, manual process)
 *   failed and refunded are terminal.
 */
export const ORDER_STATUS = {
	PENDING: 'pending',
	COMPLETED: 'completed',
	FAILED: 'failed',
	REFUNDED: 'refunded',
} as const;

// ==========================================
// Types from Constants
// ==========================================

/** Union of ORDER_STATUS values — use instead of raw string literals. */
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// ==========================================
// Schemas
// ==========================================

/**
 * Zod schema for OrderStatus
 */
export const orderStatusSchema = z.enum([
	ORDER_STATUS.PENDING,
	ORDER_STATUS.COMPLETED,
	ORDER_STATUS.FAILED,
	ORDER_STATUS.REFUNDED,
]);

/**
 * Schema for the order entity from backend
 */
export const orderSchema = z.object({
	id: z.uuid(),
	raffleId: z.uuid(),
	userId: z.string(),
	ticketQuantity: z.number().int().positive(),
	unitPrice: z.string(), // Decimal as string (e.g., "10.0000")
	totalAmount: z.string(), // Decimal as string (e.g., "50.0000")
	currency: z.string().length(3), // ISO 4217 (e.g., "USD")
	promoCode: z.string().nullable().optional(),
	status: orderStatusSchema,
	createdAt: z.string(), // ISO datetime
	updatedAt: z.string(), // ISO datetime
	raffleName: z.string().optional().default('N/A'), // Not in all endpoints — FE defaults to 'N/A' for display
	raffleSlug: z.string().optional(), // Optional slug for linking
	/** Nested crypto session summary — null when no crypto session exists for this order.
	 * Matches BE CryptoSessionSummaryDto shape exactly. */
	cryptoSession: z
		.object({
			id: z.string(),
			status: cryptoPaymentStatusSchema,
			txHash: z.string().nullable(),
			/** Unbounded text — BE column is `text()`. Truncate at display-time if needed. */
			failureReason: z.string().nullable(),
			completedAt: z.string().nullable(),
			confirmationTarget: z.number(),
			confirmDeadline: z.string(),
		})
		.nullable()
		.optional(),
});

/**
 * Schema for creating an order (request payload)
 */
export const createOrderPayloadSchema = z.object({
	raffleId: z.uuid(),
	ticketQuantity: z.number().int().positive(),
	promoCode: z.string().optional(),
});

// ==========================================
// Inferred Types
// ==========================================

/** Order entity from BE — used across order listing, checkout status, and payment flows. */
export type Order = z.infer<typeof orderSchema>;
/** Payload for POST /orders/checkout — creates or reuses a pending order. */
export type CreateOrderPayload = z.infer<typeof createOrderPayloadSchema>;

// ==========================================
// Order with Raffle Schema (for list view)
// ==========================================

/**
 * Schema for order in list views (same as orderSchema, alias for clarity)
 */
export const orderWithRaffleSchema = orderSchema;

export type OrderWithRaffle = z.infer<typeof orderWithRaffleSchema>;

// ==========================================
// Orders Response Schema (paginated)
// ==========================================

/**
 * Schema for backend orders response
 * Backend returns { total, orders } format
 */
export const ordersBackendResponseSchema = z.object({
	total: z.number(),
	orders: z.array(orderWithRaffleSchema),
});

/** FE-normalized wrapper over ordersBackendResponseSchema — produced in get-my-orders.ts. */
export const ordersResponseSchema = z.object({
	items: z.array(orderWithRaffleSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
});

export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
