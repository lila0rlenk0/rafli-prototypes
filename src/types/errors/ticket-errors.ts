import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

export const TICKET_ERROR_CODES = {
	/** User has no tickets for the specified raffle */
	NO_TICKETS: 'core:ticket:no-tickets',
	/** Invalid raffle ID provided */
	INVALID_RAFFLE: 'core:ticket:invalid-raffle',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

export type TicketErrorCode =
	| (typeof TICKET_ERROR_CODES)[keyof typeof TICKET_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
