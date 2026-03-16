import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Comment error codes — maps to backend "core:comment:*" error codes
 * for create, vote, delete, and fetch operations.
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
	/** User tried to vote on their own comment */
	SELF_VOTE: 'core:comment:self-vote',
	/** Comment body failed validation (too short, too long, etc.) */
	INVALID_BODY: 'core:comment:invalid-body',

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
