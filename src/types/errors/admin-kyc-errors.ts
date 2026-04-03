import type { CommonErrorCode } from './common-errors';

/**
 * Admin KYC Error Codes
 *
 * Backend errors for admin verification review endpoints.
 * Uses the same `core:verification:*` prefix as user-facing KYC errors
 * since they share the same backend module.
 */
export const ADMIN_KYC_ERROR_CODES = {
	/** Generic fetch failure for list/detail requests */
	FETCH_FAILED: 'fetch_failed',
	/** Submission not found by ID */
	NOT_FOUND: 'core:verification:not-found',
	/** Submission hasn't been finalized yet — still in draft */
	NOT_FINALIZED: 'core:verification:not-finalized',
	/** Submission is not in pending status (already approved/rejected) */
	NOT_PENDING: 'core:verification:not-pending',
	/** Submission already approved or rejected by another admin */
	ALREADY_REVIEWED: 'core:verification:already-reviewed',
	/** Admin attempted to review their own submission */
	SELF_REVIEW: 'core:verification:self-review',
} as const;

/**
 * Type representing all possible admin KYC error codes
 */
export type AdminKycErrorCode =
	| (typeof ADMIN_KYC_ERROR_CODES)[keyof typeof ADMIN_KYC_ERROR_CODES]
	| CommonErrorCode;
