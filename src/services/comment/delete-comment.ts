'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapCommentError, success } from '@/lib/errors';
import { deleteCommentResponseSchema } from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Soft-deletes a comment (owner or raffle host only)
 *
 * Comment body becomes "[Deleted]", isDeleted flag set to true.
 * Replies are preserved — only the comment body is redacted.
 *
 * @param commentId - The comment ID to delete
 * @returns ServiceResponse with void on success, CommentErrorCode on failure
 */
export async function deleteComment(
	commentId: string,
): Promise<ServiceResponse<void, CommentErrorCode>> {
	try {
		const response = await authenticatedClient.delete(`/comments/${commentId}`);
		deleteCommentResponseSchema.parse(response.data);
		return success(undefined);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Delete comment response validation failed:', error);
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
