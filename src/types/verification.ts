import { z } from 'zod';

/**
 * Schema for verifying a single ticket against the merkle manifest.
 *
 * Validation boundary: server-side — parsed from verification API responses.
 */
export const ticketVerificationSchema = z.object({
	ticketId: z.number(),
	ticketCode: z.string(),
	raffleId: z.string(),
	merkleVerified: z.boolean(),
	chunkIndex: z.number(),
	isVoided: z.boolean(),
	isWinner: z.boolean(),
	// Backend always emits this field; `null` when the ticket did not win.
	// Must be `.nullable()` — `.optional()` only accepts undefined and would
	// trip Zod validation on every losing ticket ("Invalid response from server").
	winnerPosition: z.number().nullable(),
});

/** Schema for verifying a winner selection — proves VRF → ticket mapping. */
export const winnerVerificationSchema = z.object({
	position: z.number(),
	actualTicketId: z.number(),
	computedTicketId: z.number(),
	ticketCode: z.string(),
	randomNumber: z.string(),
	formula: z.string(),
	merkleVerified: z.boolean(),
});

/** Schema for a merkle inclusion proof for a specific ticket. */
export const merkleProofSchema = z.object({
	ticketId: z.number(),
	leafHash: z.string(),
	proof: z.array(z.string()),
	root: z.string(),
	chunkIndex: z.number(),
	merkleVerified: z.boolean(),
});

/** Full verification data for a completed raffle — on-chain anchors + winner proofs. */
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

/** Single ticket verification result against merkle manifest. */
export type TicketVerification = z.infer<typeof ticketVerificationSchema>;
/** Winner selection audit trail — VRF random → ticket mapping proof. */
export type WinnerVerification = z.infer<typeof winnerVerificationSchema>;
/** Merkle inclusion proof for a ticket. */
export type MerkleProof = z.infer<typeof merkleProofSchema>;
/** Complete raffle verification data including on-chain anchors and winner proofs. */
export type RaffleVerificationData = z.infer<
	typeof raffleVerificationDataSchema
>;
