import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Review Error Codes
 *
 * Error codes for review operations.
 * Uses "core:review:" prefix to align with backend conventions.
 */

/**
 * Review error codes constant object
 */
export const REVIEW_ERROR_CODES = {
	/** User cannot review this raffle (not a winner) */
	NOT_ELIGIBLE: 'core:review:not-eligible',
	/** User already submitted a review for this raffle */
	ALREADY_REVIEWED: 'core:review:already-reviewed',
	/** Review not found */
	NOT_FOUND: 'core:review:not-found',
	/** Raffle not found */
	RAFFLE_NOT_FOUND: 'core:raffle:not-found',
	/** Failed to fetch review data */
	FETCH_FAILED: 'fetch_failed',
	/** Failed to create review */
	CREATE_FAILED: 'create_failed',
} as const;

/**
 * Review error code type
 * Represents all possible review-specific, client-side, and common error codes
 */
export type ReviewErrorCode =
	| (typeof REVIEW_ERROR_CODES)[keyof typeof REVIEW_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
