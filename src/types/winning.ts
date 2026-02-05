import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

export const WINNING_STATUS = {
	PENDING: 'pending',
	AWAITING_HOST: 'awaiting_host',
	SENT: 'sent',
	DELIVERED: 'delivered',
	RECEIVED: 'received',
	DISPUTED: 'disputed',
	RESOLVED: 'resolved',
} as const;

// ==========================================
// Types from Constants
// ==========================================

export type WinningStatus =
	(typeof WINNING_STATUS)[keyof typeof WINNING_STATUS];

// ==========================================
// Schemas
// ==========================================

/**
 * Zod schema for WinningStatus
 */
export const winningStatusSchema = z.enum([
	WINNING_STATUS.PENDING,
	WINNING_STATUS.AWAITING_HOST,
	WINNING_STATUS.SENT,
	WINNING_STATUS.DELIVERED,
	WINNING_STATUS.RECEIVED,
	WINNING_STATUS.DISPUTED,
	WINNING_STATUS.RESOLVED,
]);

/**
 * Schema for shipping address information
 */
export const shippingInfoSchema = z.object({
	name: z.string(),
	address: z.string(),
	city: z.string(),
	zip: z.string(),
	country: z.string(),
	phone: z.string().nullable().optional(),
});

/**
 * Schema for a single winning entry
 */
export const winningSchema = z.object({
	id: z.string(),
	raffleId: z.string(),
	userId: z.string(),
	position: z.number(),
	status: winningStatusSchema,
	claimedAt: z.string().nullable(),
	sentAt: z.string().nullable(),
	deliveredAt: z.string().nullable(),
	receivedAt: z.string().nullable(),
	shippingInfo: shippingInfoSchema.nullable().optional(),
	proofUrl: z.string().nullable().optional(),
	hostNotes: z.string().nullable().optional(),
});

/**
 * Schema for list winnings response
 */
export const listWinningsResponseSchema = z.object({
	winnings: z.array(winningSchema),
});

// ==========================================
// Request Payload Schemas
// ==========================================

/**
 * Schema for claim winning request payload
 */
export const claimWinningPayloadSchema = z.object({
	claimType: z.literal('shipping'),
	shippingInfo: z.object({
		name: z.string().min(1).max(100),
		address: z.string().min(1).max(500),
		city: z.string().min(1).max(100),
		zip: z.string().min(1).max(20),
		country: z.string().min(1).max(100),
		phone: z.string().max(30).optional(),
	}),
});

/**
 * Schema for mark sent request payload
 */
export const markSentPayloadSchema = z.object({
	proofUrl: z.string().url().max(512),
	hostNotes: z.string().max(2_000).optional(),
});

// ==========================================
// Inferred Types
// ==========================================

export type ShippingInfo = z.infer<typeof shippingInfoSchema>;
export type Winning = z.infer<typeof winningSchema>;
export type ListWinningsResponse = z.infer<typeof listWinningsResponseSchema>;
export type ClaimWinningPayload = z.infer<typeof claimWinningPayloadSchema>;
export type MarkSentPayload = z.infer<typeof markSentPayloadSchema>;

// ==========================================
// Host Winner Entry (for fulfillment management)
// ==========================================

export const CLAIM_TYPE = {
	SHIPPING: 'shipping',
	WALLET: 'wallet',
} as const;

export type ClaimType = (typeof CLAIM_TYPE)[keyof typeof CLAIM_TYPE];

/**
 * Schema for user avatar with expiring URL
 */
export const userAvatarSchema = z.object({
	url: z.string(),
	expiresAt: z.string(),
});

/**
 * Schema for a winner entry in host's fulfillment list view
 */
export const hostWinnerEntrySchema = z.object({
	id: z.string(),
	position: z.number(),
	raffleId: z.string(),
	userId: z.string(),
	userName: z.string().nullable(),
	userAvatar: userAvatarSchema.nullable(),
	status: winningStatusSchema,
	claimType: z.enum([CLAIM_TYPE.SHIPPING, CLAIM_TYPE.WALLET]).nullable(),
	shippingInfo: shippingInfoSchema.nullable(),
	claimedAt: z.string().nullable(),
	sentAt: z.string().nullable(),
	deliveredAt: z.string().nullable(),
	receivedAt: z.string().nullable(),
	disputedAt: z.string().nullable(),
	resolvedAt: z.string().nullable(),
	hostNotes: z.string().nullable(),
	proofUrl: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/**
 * Schema for host's raffle winners paginated response
 */
export const hostRaffleWinningsResponseSchema = z.object({
	items: z.array(hostWinnerEntrySchema),
	limit: z.number(),
	page: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

export type UserAvatar = z.infer<typeof userAvatarSchema>;
export type HostWinnerEntry = z.infer<typeof hostWinnerEntrySchema>;
export type HostRaffleWinningsResponse = z.infer<
	typeof hostRaffleWinningsResponseSchema
>;
