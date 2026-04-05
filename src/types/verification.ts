import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for ticket verification response
 */
export const ticketVerificationSchema = z.object({
	ticketId: z.number(),
	ticketCode: z.string(),
	raffleId: z.string(),
	merkleVerified: z.boolean(),
	chunkIndex: z.number(),
	isVoided: z.boolean(),
	isWinner: z.boolean(),
	winnerPosition: z.number().optional(),
});

/**
 * Schema for winner verification response
 */
export const winnerVerificationSchema = z.object({
	position: z.number(),
	actualTicketId: z.number(),
	computedTicketId: z.number(),
	ticketCode: z.string(),
	randomNumber: z.string(),
	formula: z.string(),
	merkleVerified: z.boolean(),
});

/**
 * Schema for merkle proof response
 */
export const merkleProofSchema = z.object({
	ticketId: z.number(),
	leafHash: z.string(),
	proof: z.array(z.string()),
	root: z.string(),
	chunkIndex: z.number(),
	merkleVerified: z.boolean(),
});

/**
 * Schema for aggregated raffle verification data
 */
export const raffleVerificationDataSchema = z.object({
	raffleId: z.string(),
	title: z.string(),
	totalTickets: z.number(),
	manifestHash: z.string().nullable(),
	commitTxHash: z.string().nullable(),
	vrfRequestId: z.string().nullable(),
	vrfFulfillTxHash: z.string().nullable(),
	winners: z.array(winnerVerificationSchema),
});

// ==========================================
// Inferred Types
// ==========================================

export type TicketVerification = z.infer<typeof ticketVerificationSchema>;
export type WinnerVerification = z.infer<typeof winnerVerificationSchema>;
export type MerkleProof = z.infer<typeof merkleProofSchema>;
export type RaffleVerificationData = z.infer<
	typeof raffleVerificationDataSchema
>;
