'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapCommentError, success } from '@/lib/errors';
import {
	voteResponseSchema,
	type VoteResponse,
	type VoteType,
} from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Votes on a comment (upvote or downvote toggle)
 *
 * Voting the same direction twice removes the vote (toggle behavior).
 * e.g., upvote → upvote = no vote.
 *
 * @param commentId - The comment ID to vote on
 * @param type - Vote direction: 'upvote' or 'downvote'
 * @returns ServiceResponse with updated vote state or error code
 */
export async function voteComment(
	commentId: string,
	type: VoteType,
): Promise<ServiceResponse<VoteResponse, CommentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/comments/${commentId}/vote`,
			{ voteType: type },
		);
		const validated = voteResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Vote comment response validation failed:', error);
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
