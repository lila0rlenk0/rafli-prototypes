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
	/** Winning not found */
	NOT_FOUND: 'core:winning:not-found',
	/** Invalid status transition */
	INVALID_STATUS: 'core:winning:invalid-status',
	/** User is not the winner */
	NOT_OWNER: 'core:winning:not-owner',
	/** Raffle not in fulfilling status */
	RAFFLE_NOT_FULFILLING: 'core:raffle:not-fulfilling',
	/** Winner has not claimed with shipping info */
	NOT_CLAIMED: 'core:winning:not-claimed',
	/** Permission denied (not raffle host) */
	PERMISSION_DENIED: 'core:winning:permission-denied',

	/** Generic fetch failure (Zod validation, etc.) */
	FETCH_FAILED: 'fetch_failed',
	/** Failed to confirm received */
	CONFIRM_FAILED: 'confirm_failed',
	/** Failed to claim winning */
	CLAIM_FAILED: 'claim_failed',
	/** Failed to mark as sent */
	MARK_SENT_FAILED: 'mark_sent_failed',
	/** Failed to mark as delivered */
	MARK_DELIVERED_FAILED: 'mark_delivered_failed',
} as const;

/**
 * Winning error code type
 * Represents all possible winning-specific, client-side, and common error codes
 */
export type WinningErrorCode =
	| (typeof WINNING_ERROR_CODES)[keyof typeof WINNING_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
