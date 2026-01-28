import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Update Error Codes
 *
 * Update-specific error codes that match backend "core:*" error codes
 * for update endpoints (create, fetch, upload images).
 *
 * These codes are extracted directly from backend responses using the
 * RFC 7807 URN format or simple code format.
 */

/**
 * Update error codes constant object
 * Contains core/update error codes used in the application
 */
export const UPDATE_ERROR_CODES = {
	// Core update errors
	/** Update not found */
	NOT_FOUND: 'core:update:not-found',
	/** User doesn't have permission to create updates for this raffle */
	PERMISSION_DENIED: 'core:update:permission-denied',
	/** Raffle must be live to post updates */
	RAFFLE_NOT_LIVE: 'core:raffle:not-live',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Update error code type
 * Represents all possible update-specific, client-side, and common error codes
 */
export type UpdateErrorCode =
	| (typeof UPDATE_ERROR_CODES)[keyof typeof UPDATE_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
