import {
	COMMENT_ERROR_CODES,
	type CommentErrorCode,
	COMMON_ERROR_CODES,
} from '@/types/errors';

/**
 * Maps comment vote error codes to user-friendly messages
 * Uses constants to ensure compile-time safety if backend codes change.
 * Used in the vote mutation's onError handler.
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
			return 'Voting is no longer available for this raffle.';
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
