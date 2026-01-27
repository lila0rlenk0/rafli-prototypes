import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Winning Error Codes
 *
 * Winning-specific error codes that match backend "core:winning:*" error codes
 * from winning endpoints (fetch winnings, claim prizes).
 *
 * These codes are extracted directly from backend responses using the
 * RFC 7807 URN format or simple code format.
 */

/**
 * Winning error codes constant object
 * Contains only essential core/winning error codes used in the application
 */
export const WINNING_ERROR_CODES = {
	/** User has no winnings */
	NO_WINNINGS: 'core:winning:no-winnings',
	/** Invalid raffle ID provided */
	INVALID_RAFFLE: 'core:winning:invalid-raffle',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Winning error code type
 * Represents all possible winning-specific, client-side, and common error codes
 */
export type WinningErrorCode =
	| (typeof WINNING_ERROR_CODES)[keyof typeof WINNING_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
