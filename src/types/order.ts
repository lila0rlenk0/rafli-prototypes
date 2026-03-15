import { z } from 'zod';

import { cryptoPaymentStatusSchema } from './payment';

// ==========================================
// Constants
// ==========================================

export const ORDER_STATUS = {
	PENDING: 'pending',
	COMPLETED: 'completed',
	FAILED: 'failed',
	REFUNDED: 'refunded',
} as const;

// ==========================================
// Types from Constants
// ==========================================

/**
 * Represents the status of an order
 */
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
	raffleName: z.string().optional().default('N/A'), // Optional, defaults to N/A
	raffleSlug: z.string().optional(), // Optional slug for linking
	/** Nested crypto session summary — null when no crypto session exists for this order.
	 * Matches BE CryptoSessionSummaryDto shape exactly. */
	cryptoSession: z
		.object({
			id: z.string(),
			status: cryptoPaymentStatusSchema,
			txHash: z.string().nullable(),
			/** Capped at 512 chars — prevents UI overflow from backend-supplied diagnostic strings */
			failureReason: z.string().max(512).nullable(),
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

export type Order = z.infer<typeof orderSchema>;
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

/** Schema for normalized orders response for UI consumption */
export const ordersResponseSchema = z.object({
	items: z.array(orderWithRaffleSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
});

export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
