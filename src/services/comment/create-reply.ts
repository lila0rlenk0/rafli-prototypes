'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapCommentError, success } from '@/lib/errors';
import {
	commentSchema,
	type Comment,
	type CreateCommentPayload,
} from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Creates a reply to a comment
 *
 * Single-level nesting only — replies cannot have their own replies.
 *
 * @param raffleId - The raffle ID
 * @param commentId - The parent comment ID to reply to
 * @param payload - Reply body text
 * @returns ServiceResponse with created reply or error code
 */
export async function createReply(
	raffleId: string,
	commentId: string,
	payload: CreateCommentPayload,
): Promise<ServiceResponse<Comment, CommentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/comments/${commentId}/replies`,
			payload,
		);
		const validated = commentSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Create reply response validation failed:', error);
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
