import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

export const NOTIFICATION_TYPE = {
	DELIVERY_CONFIRMED: 'delivery_confirmed',
	DISPUTE_OPENED: 'dispute_opened',
	DISPUTE_RESOLVED: 'dispute_resolved',
	FULFILLMENT_STARTED: 'fulfillment_started',
	HOST_DELIVERY_CONFIRMATION_REMINDER: 'host_delivery_confirmation_reminder',
	HOST_SHIPPING_REMINDER: 'host_shipping_reminder',
	NEW_RAFFLE_CREATED: 'new_raffle_created',
	ORDER_CONFIRMED: 'order_confirmed',
	// Kept for parity with backend enum; old rows can still contain this deprecated type.
	PARTIAL_PARTICIPATION_COMPLETED: 'partial_participation_completed',
	PARTIAL_PARTICIPATION_HOST: 'partial_participation_host',
	PARTIAL_PARTICIPATION_NON_WINNER: 'partial_participation_non_winner',
	PARTIAL_PARTICIPATION_WINNER: 'partial_participation_winner',
	PRIZE_CLAIM_REMINDER: 'prize_claim_reminder',
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
 * Maps deprecated `partial_raffle_*` DB values to their current equivalents.
 * Backend migrated these values, but pre-migration rows may still exist.
 * Preprocess transforms them before Zod validation so the inferred type stays clean.
 */
const DEPRECATED_TYPE_MAP: Record<string, NotificationType> = {
	partial_raffle_host: NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_HOST,
	partial_raffle_non_winner: NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_NON_WINNER,
	partial_raffle_winner: NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_WINNER,
};

/** Raw enum schema (current values only) */
const rawNotificationTypeSchema = z.enum([
	NOTIFICATION_TYPE.DELIVERY_CONFIRMED,
	NOTIFICATION_TYPE.DISPUTE_OPENED,
	NOTIFICATION_TYPE.DISPUTE_RESOLVED,
	NOTIFICATION_TYPE.FULFILLMENT_STARTED,
	NOTIFICATION_TYPE.HOST_DELIVERY_CONFIRMATION_REMINDER,
	NOTIFICATION_TYPE.HOST_SHIPPING_REMINDER,
	NOTIFICATION_TYPE.NEW_RAFFLE_CREATED,
	NOTIFICATION_TYPE.ORDER_CONFIRMED,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_COMPLETED,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_HOST,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_NON_WINNER,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_WINNER,
	NOTIFICATION_TYPE.PRIZE_CLAIM_REMINDER,
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
 * Schema for notification type enum.
 * Accepts deprecated `partial_raffle_*` values and maps them to current equivalents.
 */
export const notificationTypeSchema = z.preprocess(
	val =>
		typeof val === 'string' && val in DEPRECATED_TYPE_MAP
			? DEPRECATED_TYPE_MAP[val]
			: val,
	rawNotificationTypeSchema,
);

/**
 * Schema for notification metadata
 * Contains optional IDs for navigation
 */
export const notificationMetadataSchema = z.object({
	raffleId: z.string().optional(),
	publicSlug: z.string().optional(),
	orderId: z.string().optional(),
	winningId: z.string().optional(),
	disputeId: z.string().optional(),
});

/**
 * Schema for a single notification
 * Type uses z.string() to tolerate deprecated/new BE types without breaking the list
 */
export const notificationSchema = z.object({
	id: z.string(),
	userId: z.string(),
	type: z.string(),
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
