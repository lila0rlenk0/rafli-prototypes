import {
	COMMENT_ERROR_CODES,
	COMMON_ERROR_CODES,
	REPORT_ERROR_CODES,
	type CommentErrorCode,
	type ReportErrorCode,
} from '@/types/errors';

/**
 * Shared domain error-message mappers.
 *
 * Lives here (rather than per-domain `lib/{domain}/error-messages.ts`) because
 * every mapper in this file has the exact same shape — `(DomainCode) => string`
 * — and a single call site each. Keeping them together prevents the audit
 * finding "one-function files scattered across lib/" from regressing.
 *
 * Mappers with richer signatures (context objects, multiple exports, or
 * co-located unit tests) stay domain-local — see `lib/checkout/error-messages.ts`.
 */

/**
 * Maps comment vote error codes to user-friendly messages.
 * Uses constants to ensure compile-time safety if backend codes change.
 * Used in the vote mutation's onError handler.
 *
 * Handles: all `CommentErrorCode` values plus the network/timeout/unauthorized
 * subset of `CommonErrorCode` that can surface from vote mutations.
 *
 * @param errorCode - Comment error code from vote service action
 * @returns Human-readable error string for toast/UI display
 */
export function getVoteErrorMessage(errorCode: CommentErrorCode): string {
	switch (errorCode) {
		case COMMENT_ERROR_CODES.SELF_VOTE:
			return "You can't vote on your own comment.";
		case COMMENT_ERROR_CODES.NOT_FOUND:
			return 'Comment not found.';
		case COMMENT_ERROR_CODES.DELETED:
			return 'This comment has been deleted.';
		case COMMENT_ERROR_CODES.RAFFLE_NOT_COMMENTABLE:
			return 'Voting is no longer available for this sweepstakes.';
		case COMMON_ERROR_CODES.NETWORK_ERROR:
			return 'Network error. Please check your connection.';
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
			return 'Request timed out. Please try again.';
		case COMMON_ERROR_CODES.UNAUTHORIZED:
			return 'Please sign in to vote.';
		default:
			return 'Failed to vote. Please try again.';
	}
}

/**
 * Maps report error codes to user-friendly messages.
 * Used in the report mutation's onError handler.
 *
 * Handles: all `ReportErrorCode` values plus the network/timeout/unauthorized
 * subset of `CommonErrorCode` that can surface from report mutations.
 *
 * @param errorCode - Report error code from report service action
 * @returns Human-readable error string for toast/UI display
 */
export function getReportErrorMessage(errorCode: ReportErrorCode): string {
	switch (errorCode) {
		case REPORT_ERROR_CODES.DUPLICATE:
			return 'You have already reported this content.';
		case REPORT_ERROR_CODES.RAFFLE_ID_REQUIRED:
			return 'Could not identify the sweepstakes for this report.';
		case REPORT_ERROR_CODES.RAFFLE_ID_MISMATCH:
			return 'Report context mismatch. Please refresh and try again.';
		case REPORT_ERROR_CODES.VALIDATION_FAILED:
			return 'Please check your report reason and try again.';
		case COMMON_ERROR_CODES.NETWORK_ERROR:
			return 'Network error. Please check your connection.';
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
			return 'Request timed out. Please try again.';
		case COMMON_ERROR_CODES.UNAUTHORIZED:
			return 'Please sign in to report content.';
		default:
			return 'Failed to submit report. Please try again.';
	}
}
