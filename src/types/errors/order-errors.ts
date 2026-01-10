import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Order Error Codes
 *
 * Order-specific error codes that match backend "core:order:*" error codes
 */

export const ORDER_ERROR_CODES = {
	// Order errors
	/** Raffle is not live */
	NOT_ACTIVE: 'core:raffle:not-active',
	/** Raffle is sold out */
	SOLD_OUT: 'core:raffle:sold-out',
	/** Order not found */
	NOT_FOUND: 'core:order:not-found',
	/** User doesn't have permission to access this order */
	PERMISSION_DENIED: 'core:order:permission-denied',
	/** Invalid ticket quantity (e.g., <= 0) */
	INVALID_QUANTITY: 'core:order:invalid-quantity',
	/** Order already completed */
	ALREADY_COMPLETED: 'core:order:already-completed',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Order error code type
 */
export type OrderErrorCode =
	| (typeof ORDER_ERROR_CODES)[keyof typeof ORDER_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
