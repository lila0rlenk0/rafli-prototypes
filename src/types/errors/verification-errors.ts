import type { CommonErrorCode } from './common-errors';

/**
 * Verification Error Codes
 *
 * Backend errors for verification endpoints (`core:verification:*` prefix).
 */
export const VERIFICATION_ERROR_CODES = {
	TICKET_NOT_FOUND: 'core:verification:ticket-not-found',
	WINNER_NOT_FOUND: 'core:verification:winner-not-found',
	PROOF_NOT_FOUND: 'core:verification:proof-not-found',
	RAFFLE_NOT_COMPLETED: 'core:verification:raffle-not-completed',
} as const;

/**
 * Type representing all possible verification error codes
 */
export type VerificationErrorCode =
	| (typeof VERIFICATION_ERROR_CODES)[keyof typeof VERIFICATION_ERROR_CODES]
	| CommonErrorCode;
