import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

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

export type ReviewErrorCode =
	| (typeof REVIEW_ERROR_CODES)[keyof typeof REVIEW_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
