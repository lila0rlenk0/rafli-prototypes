import type { CommonErrorCode } from './common-errors';

/**
 * Error codes for raffle draw verification — merkle proofs, winner selection auditing.
 *
 * Values are the exact RFC 7807 URN codes emitted by the backend public verify
 * endpoints (`GET /raffles/:id/verify-ticket/:code`, `verify-winner/:pos`,
 * `merkle-proof/:ticketId`). Do NOT invent a synthetic `core:verification:*`
 * namespace — the backend never emits those, so switch cases built on them
 * silently default. See `raffles.public.api.ts` + `get-merkle-proof.query.ts`.
 */
export const VERIFICATION_ERROR_CODES = {
	/** Ticket code not found in the ticket-ledger (raffles.public.api.ts:381). */
	TICKET_NOT_FOUND: 'ledger:ticket:not-found',
	/** Winner position out of range (raffles.public.api.ts:89). */
	WINNER_NOT_FOUND: 'core:winner:invalid-position',
	/** No published manifest — proof generation impossible (get-merkle-proof.query.ts:161). */
	PROOF_NOT_FOUND: 'core:raffle:no-manifest',
	/**
	 * Raffle has not reached a state where verification is meaningful. Backend
	 * surfaces this as either `core:raffle:not-completed` (status guard on
	 * upload) or `core:raffle:no-vrf-data` (VRF not yet received on the draw).
	 * The UI collapses both into the same "not completed" branch.
	 */
	RAFFLE_NOT_COMPLETED: 'core:raffle:no-vrf-data',
	/** Alias for the other "not completed" URN — lets switch cases match both. */
	RAFFLE_NOT_COMPLETED_ALT: 'core:raffle:not-completed',
} as const;

/** Union of verification error codes and common transport errors. */
export type VerificationErrorCode =
	| (typeof VERIFICATION_ERROR_CODES)[keyof typeof VERIFICATION_ERROR_CODES]
	| CommonErrorCode;
