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
 * Creates a top-level comment on a raffle
 *
 * @param raffleId - The raffle ID
 * @param payload - Comment body text
 * @returns ServiceResponse with created comment or error code
 */
export async function createComment(
	raffleId: string,
	payload: CreateCommentPayload,
): Promise<ServiceResponse<Comment, CommentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/comments`,
			payload,
		);
		const validated = commentSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Create comment response validation failed:', error);
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
