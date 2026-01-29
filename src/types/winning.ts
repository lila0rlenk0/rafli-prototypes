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

export type WinningStatus = (typeof WINNING_STATUS)[keyof typeof WINNING_STATUS];

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
});

/**
 * Schema for list winnings response
 */
export const listWinningsResponseSchema = z.object({
	winnings: z.array(winningSchema),
});

// ==========================================
// Inferred Types
// ==========================================

export type Winning = z.infer<typeof winningSchema>;
export type ListWinningsResponse = z.infer<typeof listWinningsResponseSchema>;
