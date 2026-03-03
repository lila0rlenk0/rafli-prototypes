import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Comment Error Codes
 *
 * Comment-specific error codes that match backend "core:*" error codes
 * for comment endpoints (create, vote, delete, fetch).
 */

/**
 * Comment error codes constant object
 * Contains core/comment error codes used in the application
 */
export const COMMENT_ERROR_CODES = {
	// Core comment errors
	/** Comment not found */
	NOT_FOUND: 'core:comment:not-found',
	/** Parent comment not found (for replies) */
	PARENT_NOT_FOUND: 'core:comment:parent-not-found',
	/** Comment already soft-deleted */
	ALREADY_DELETED: 'core:comment:already-deleted',
	/** User doesn't have permission to delete this comment */
	PERMISSION_DENIED: 'core:comment:permission-denied',
	/** Raffle status doesn't allow comments */
	RAFFLE_NOT_COMMENTABLE: 'core:comment:raffle-not-commentable',
	/** Comment is deleted — returned when trying to vote on deleted comment */
	DELETED: 'core:comment:deleted',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Comment error code type
 * Represents all possible comment-specific, client-side, and common error codes
 */
export type CommentErrorCode =
	| (typeof COMMENT_ERROR_CODES)[keyof typeof COMMENT_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
