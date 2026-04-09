import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

export const UPDATE_ERROR_CODES = {
	// Core update errors
	/** Update not found */
	NOT_FOUND: 'core:update:not-found',
	/** User doesn't have permission to create updates for this raffle */
	PERMISSION_DENIED: 'core:update:permission-denied',
	/** Raffle must be live to post updates */
	RAFFLE_NOT_LIVE: 'core:raffle:not-live',
	/** Raffle not found */
	RAFFLE_NOT_FOUND: 'core:raffle:not-found',

	// Image-related errors
	/** Too many images uploaded */
	IMAGE_LIMIT_EXCEEDED: 'core:update:image-limit-exceeded',
	/** Image not found */
	IMAGE_NOT_FOUND: 'core:update:image-not-found',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

export type UpdateErrorCode =
	| (typeof UPDATE_ERROR_CODES)[keyof typeof UPDATE_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
