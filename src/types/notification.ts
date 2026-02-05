import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

export const NOTIFICATION_TYPE = {
	DELIVERY_CONFIRMED: 'delivery_confirmed',
	DISPUTE_OPENED: 'dispute_opened',
	DISPUTE_RESOLVED: 'dispute_resolved',
	FULFILLMENT_STARTED: 'fulfillment_started',
	NEW_RAFFLE_CREATED: 'new_raffle_created',
	ORDER_CONFIRMED: 'order_confirmed',
	PRIZE_AUTO_CONFIRMED: 'prize_auto_confirmed',
	PRIZE_DELIVERED: 'prize_delivered',
	PRIZE_SENT: 'prize_sent',
	RAFFLE_CANCELLED: 'raffle_cancelled',
	RAFFLE_COMPLETED: 'raffle_completed',
	RAFFLE_ENDING_SOON: 'raffle_ending_soon',
	RAFFLE_STARTED: 'raffle_started',
	RAFFLE_WON: 'raffle_won',
	REVIEW_RECEIVED: 'review_received',
	WINNER_CLAIMED: 'winner_claimed',
} as const;

// ==========================================
// Types from Constants
// ==========================================

export type NotificationType =
	(typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for notification type enum
 */
export const notificationTypeSchema = z.enum([
	NOTIFICATION_TYPE.DELIVERY_CONFIRMED,
	NOTIFICATION_TYPE.DISPUTE_OPENED,
	NOTIFICATION_TYPE.DISPUTE_RESOLVED,
	NOTIFICATION_TYPE.FULFILLMENT_STARTED,
	NOTIFICATION_TYPE.NEW_RAFFLE_CREATED,
	NOTIFICATION_TYPE.ORDER_CONFIRMED,
	NOTIFICATION_TYPE.PRIZE_AUTO_CONFIRMED,
	NOTIFICATION_TYPE.PRIZE_DELIVERED,
	NOTIFICATION_TYPE.PRIZE_SENT,
	NOTIFICATION_TYPE.RAFFLE_CANCELLED,
	NOTIFICATION_TYPE.RAFFLE_COMPLETED,
	NOTIFICATION_TYPE.RAFFLE_ENDING_SOON,
	NOTIFICATION_TYPE.RAFFLE_STARTED,
	NOTIFICATION_TYPE.RAFFLE_WON,
	NOTIFICATION_TYPE.REVIEW_RECEIVED,
	NOTIFICATION_TYPE.WINNER_CLAIMED,
]);

/**
 * Schema for notification metadata
 * Contains optional IDs for navigation
 */
export const notificationMetadataSchema = z
	.object({
		raffleId: z.string().optional(),
		publicSlug: z.string().optional(),
		orderId: z.string().optional(),
		winningId: z.string().optional(),
		disputeId: z.string().optional(),
	})
	.passthrough();

/**
 * Schema for a single notification
 */
export const notificationSchema = z.object({
	id: z.string(),
	userId: z.string(),
	type: notificationTypeSchema,
	title: z.string(),
	body: z.string(),
	read: z.boolean(),
	metadata: notificationMetadataSchema.nullable(),
	createdAt: z.string(),
});

/**
 * Schema for list notifications response (paginated)
 */
export const listNotificationsResponseSchema = z.object({
	notifications: z.array(notificationSchema),
	total: z.number(),
	unreadCount: z.number(),
	limit: z.number(),
	offset: z.number(),
});

/**
 * Schema for unread count response
 */
export const unreadCountResponseSchema = z.object({
	count: z.number(),
});

/**
 * Schema for mark read response
 */
export const markReadResponseSchema = z.object({
	success: z.boolean(),
});

/**
 * Schema for WebSocket token response
 */
export const wsTokenResponseSchema = z.object({
	token: z.string(),
	expiresIn: z.number(),
});

/**
 * Schema for WebSocket stream event
 */
export const notificationStreamEventSchema = z.object({
	event: z.literal('new_notification'),
});

// ==========================================
// Inferred Types
// ==========================================

export type NotificationMetadata = z.infer<typeof notificationMetadataSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type ListNotificationsResponse = z.infer<
	typeof listNotificationsResponseSchema
>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
export type MarkReadResponse = z.infer<typeof markReadResponseSchema>;
export type WsTokenResponse = z.infer<typeof wsTokenResponseSchema>;

// ==========================================
// Query Types
// ==========================================

/**
 * Query parameters for fetching notifications
 */
export interface NotificationQuery {
	limit?: number;
	offset?: number;
}
