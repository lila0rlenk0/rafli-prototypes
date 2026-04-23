import { z } from 'zod';

import { cryptoPaymentStatusSchema } from './payment';

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

/** Union of ORDER_STATUS values — use instead of raw string literals. */
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const orderStatusSchema = z.enum([
	ORDER_STATUS.PENDING,
	ORDER_STATUS.COMPLETED,
	ORDER_STATUS.FAILED,
	ORDER_STATUS.REFUNDED,
]);

/**
 * Order entity — central to checkout, payment, and order history flows.
 *
 * Validation boundary: server-side — parsed in every order-fetching server action.
 * Monetary values are decimal strings (e.g., "10.0000") to avoid floating-point drift.
 */
export const orderSchema = z.object({
	id: z.uuidv7(),
	raffleId: z.uuidv7(),
	userId: z.string(),
	ticketQuantity: z.number().int().positive(),
	// decimal as string (e.g., "10.0000")
	unitPrice: z.string(),
	// decimal as string (e.g., "50.0000")
	totalAmount: z.string(),
	// ISO 4217 (e.g., "USD")
	currency: z.string().length(3),
	promoCode: z.string().nullable().optional(),
	status: orderStatusSchema,
	// ISO datetime
	createdAt: z.string(),
	// ISO datetime
	updatedAt: z.string(),
	// not in all endpoints — FE defaults to 'N/A' for display
	raffleName: z.string().optional().default('N/A'),
	// optional slug for linking
	raffleSlug: z.string().optional(),
	/** Nested crypto session summary — null when no crypto session exists for this order.
	 * Matches BE CryptoSessionSummaryDto shape exactly. */
	cryptoSession: z
		.object({
			id: z.string(),
			status: cryptoPaymentStatusSchema,
			txHash: z.string().nullable(),
			/** BE column is `varchar(500)` — may need display-time truncation for edge cases. */
			failureReason: z.string().nullable(),
			completedAt: z.string().nullable(),
			confirmationTarget: z.number(),
			confirmDeadline: z.string(),
		})
		.nullable()
		.optional(),
});

export const createOrderPayloadSchema = z.object({
	raffleId: z.uuidv7(),
	ticketQuantity: z.number().int().positive(),
	promoCode: z.string().optional(),
});

/** Order entity from BE — used across order listing, checkout status, and payment flows. */
export type Order = z.infer<typeof orderSchema>;
/** Payload for POST /orders/checkout — creates or reuses a pending order. */
export type CreateOrderPayload = z.infer<typeof createOrderPayloadSchema>;

/**
 * Semantic alias for Order — used in list views where `raffleName`/`raffleSlug`
 * are expected to be populated. Same shape, different intent: signals that
 * the component requires the optional raffle display fields.
 */
export type OrderWithRaffle = Order;

/**
 * Schema for backend orders response — includes full pagination metadata.
 * Using BE values directly avoids divergence in totalPages calculation.
 */
export const ordersBackendResponseSchema = z.object({
	limit: z.number(),
	orders: z.array(orderSchema),
	page: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

/** FE-normalized wrapper over ordersBackendResponseSchema — produced in get-my-orders.ts. */
export const ordersResponseSchema = z.object({
	items: z.array(orderSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	totalPages: z.number(),
});

export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
