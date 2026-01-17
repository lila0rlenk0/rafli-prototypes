import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Ticket Error Codes
 *
 * Ticket-specific error codes that match backend "core:ticket:*" error codes
 * from ticket endpoints (fetch codes, fetch balances).
 *
 * These codes are extracted directly from backend responses using the
 * RFC 7807 URN format or simple code format.
 */

/**
 * Ticket error codes constant object
 * Contains only essential core/ticket error codes used in the application
 */
export const TICKET_ERROR_CODES = {
	/** User has no tickets for the specified raffle */
	NO_TICKETS: 'core:ticket:no-tickets',
	/** Invalid raffle ID provided */
	INVALID_RAFFLE: 'core:ticket:invalid-raffle',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Ticket error code type
 * Represents all possible ticket-specific, client-side, and common error codes
 */
export type TicketErrorCode =
	| (typeof TICKET_ERROR_CODES)[keyof typeof TICKET_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
