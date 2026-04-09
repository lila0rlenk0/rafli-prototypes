import type { CommonErrorCode } from './common-errors';

/** Error codes for raffle draw verification — merkle proofs, winner selection auditing. */
export const VERIFICATION_ERROR_CODES = {
	/** Ticket code not found in the draw manifest */
	TICKET_NOT_FOUND: 'core:verification:ticket-not-found',
	/** Winner position not found in draw results */
	WINNER_NOT_FOUND: 'core:verification:winner-not-found',
	/** Merkle proof not found for the given ticket */
	PROOF_NOT_FOUND: 'core:verification:proof-not-found',
	/** Raffle has not completed — verification only available post-draw */
	RAFFLE_NOT_COMPLETED: 'core:verification:raffle-not-completed',
} as const;

/** Union of verification error codes and common transport errors. */
export type VerificationErrorCode =
	| (typeof VERIFICATION_ERROR_CODES)[keyof typeof VERIFICATION_ERROR_CODES]
	| CommonErrorCode;
