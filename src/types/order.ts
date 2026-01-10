import { z } from 'zod';

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
