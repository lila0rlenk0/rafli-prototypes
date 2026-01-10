import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Raffle/Core Error Codes
 *
 * Raffle-specific error codes that match backend "core:*" error codes
 * from raffle endpoints (create, fetch, upload, update, publish).
 *
 * These codes are extracted directly from backend responses using the
 * RFC 7807 URN format or simple code format.
 *
 * Note: Backend uses "core:" prefix instead of "raffle:"
 */

/**
 * Raffle error codes constant object
 * Contains only essential core/raffle error codes used in the application
 */
export const RAFFLE_ERROR_CODES = {
	// Core raffle errors
	/** Raffle not found */
	NOT_FOUND: 'core:raffle:not-found',
	/** User doesn't have permission to perform this action */
	PERMISSION_DENIED: 'core:raffle:permission-denied',
	/** Invalid raffle dates (end date before start date) */
	INVALID_DATES: 'core:raffle:invalid-dates',
	/** Raffle is not in draft status (cannot be edited) */
	NOT_DRAFT: 'core:raffle:not-draft',

	// Gallery errors
	/** Maximum gallery images limit exceeded */
	GALLERY_LIMIT_EXCEEDED: 'core:gallery:limit-exceeded',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Raffle error code type
 * Represents all possible raffle-specific, client-side, and common error codes
 */
export type RaffleErrorCode =
	| (typeof RAFFLE_ERROR_CODES)[keyof typeof RAFFLE_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
