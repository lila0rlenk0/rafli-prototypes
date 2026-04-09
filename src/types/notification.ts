import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

/**
 * Notification type constants — synced with BE core/db/schema.ts notification_type enum.
 * 31 BE values, 27 active. Keep alphabetical within sections for easy diffing.
 */
export const NOTIFICATION_TYPE = {
	CHAT_MESSAGE: 'chat_message',
	COMMENT_ON_RAFFLE: 'comment_on_raffle',
	CONFIRM_RECEIPT_REMINDER: 'confirm_receipt_reminder',
	DELIVERY_CONFIRMED: 'delivery_confirmed',
	DISPUTE_DEADLINE_REMINDER: 'dispute_deadline_reminder',
	DISPUTE_OPENED: 'dispute_opened',
	DISPUTE_RESOLVED: 'dispute_resolved',
	DISPUTE_UNDER_REVIEW: 'dispute_under_review',
	FULFILLMENT_STARTED: 'fulfillment_started',
	HOST_DELIVERY_CONFIRMATION_REMINDER: 'host_delivery_confirmation_reminder',
	HOST_SHIPPING_REMINDER: 'host_shipping_reminder',
	LATE_ORDER_COMPLETION: 'late_order_completion',
	NEW_RAFFLE_CREATED: 'new_raffle_created',
	ORDER_CONFIRMED: 'order_confirmed',
	PARTIAL_PARTICIPATION_COMPLETED: 'partial_participation_completed',
	PARTIAL_PARTICIPATION_HOST: 'partial_participation_host',
	PARTIAL_PARTICIPATION_NON_WINNER: 'partial_participation_non_winner',
	PARTIAL_PARTICIPATION_WINNER: 'partial_participation_winner',
	PRIZE_AUTO_CONFIRMED: 'prize_auto_confirmed',
	PRIZE_CLAIM_REMINDER: 'prize_claim_reminder',
	PRIZE_DELIVERED: 'prize_delivered',
	PRIZE_SENT: 'prize_sent',
	RAFFLE_CANCELLED: 'raffle_cancelled',
	RAFFLE_COMPLETED: 'raffle_completed',
	RAFFLE_ENDING_SOON: 'raffle_ending_soon',
	RAFFLE_STARTED: 'raffle_started',
	RAFFLE_UPDATE_POSTED: 'raffle_update_posted',
	RAFFLE_WON: 'raffle_won',
	REPLY_TO_COMMENT: 'reply_to_comment',
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

/** Schema for notification type enum — all BE notification types */
export const notificationTypeSchema = z.enum([
	NOTIFICATION_TYPE.CHAT_MESSAGE,
	NOTIFICATION_TYPE.COMMENT_ON_RAFFLE,
	NOTIFICATION_TYPE.CONFIRM_RECEIPT_REMINDER,
	NOTIFICATION_TYPE.DELIVERY_CONFIRMED,
	NOTIFICATION_TYPE.DISPUTE_DEADLINE_REMINDER,
	NOTIFICATION_TYPE.DISPUTE_OPENED,
	NOTIFICATION_TYPE.DISPUTE_RESOLVED,
	NOTIFICATION_TYPE.DISPUTE_UNDER_REVIEW,
	NOTIFICATION_TYPE.FULFILLMENT_STARTED,
	NOTIFICATION_TYPE.HOST_DELIVERY_CONFIRMATION_REMINDER,
	NOTIFICATION_TYPE.HOST_SHIPPING_REMINDER,
	NOTIFICATION_TYPE.LATE_ORDER_COMPLETION,
	NOTIFICATION_TYPE.NEW_RAFFLE_CREATED,
	NOTIFICATION_TYPE.ORDER_CONFIRMED,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_COMPLETED,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_HOST,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_NON_WINNER,
	NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_WINNER,
	NOTIFICATION_TYPE.PRIZE_AUTO_CONFIRMED,
	NOTIFICATION_TYPE.PRIZE_CLAIM_REMINDER,
	NOTIFICATION_TYPE.PRIZE_DELIVERED,
	NOTIFICATION_TYPE.PRIZE_SENT,
	NOTIFICATION_TYPE.RAFFLE_CANCELLED,
	NOTIFICATION_TYPE.RAFFLE_COMPLETED,
	NOTIFICATION_TYPE.RAFFLE_ENDING_SOON,
	NOTIFICATION_TYPE.RAFFLE_STARTED,
	NOTIFICATION_TYPE.RAFFLE_UPDATE_POSTED,
	NOTIFICATION_TYPE.RAFFLE_WON,
	NOTIFICATION_TYPE.REPLY_TO_COMMENT,
	NOTIFICATION_TYPE.REVIEW_RECEIVED,
	NOTIFICATION_TYPE.WINNER_CLAIMED,
]);

/**
 * Schema for notification metadata — synced with BE notifications/dto/notification.dto.ts.
 * Contains optional IDs for deep-link navigation (chat, comments, reviews, updates).
 */
export const notificationMetadataSchema = z.object({
	commentId: z.string().optional(),
	conversationId: z.string().optional(),
	disputeId: z.string().optional(),
	orderId: z.string().optional(),
	publicSlug: z.string().optional(),
	raffleId: z.string().optional(),
	referenceId: z.string().optional(),
	reviewId: z.string().optional(),
	updateId: z.string().optional(),
	winningId: z.string().optional(),
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
 * Schema for WebSocket stream event.
 * BE sends both 'new_notification' (actual data) and 'heartbeat' (keep-alive every 30s).
 */
export const notificationStreamEventSchema = z.object({
	event: z.enum(['new_notification', 'heartbeat']),
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
 * Schema for notification query parameters
 */
export const notificationQuerySchema = z.object({
	limit: z.number().optional(),
	offset: z.number().optional(),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
