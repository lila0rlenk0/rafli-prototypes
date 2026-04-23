import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

export const TICKET_ERROR_CODES = {
	// Backend never emits `core:ticket:no-tickets` or
	// `core:ticket:invalid-raffle`. "No tickets" surfaces as
	// `core:raffle:no-tickets` (raffle-level) and invalid-raffle simply
	// returns `core:raffle:not-found`. Dead codes dropped; the generic
	// fetch-failed fallback remains for Zod contract drift.

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

export type TicketErrorCode =
	| (typeof TICKET_ERROR_CODES)[keyof typeof TICKET_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
