'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapCommentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	listCommentsResponseSchema,
	type ListCommentsResponse,
} from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/** Params for fetching replies */
interface GetCommentRepliesParams {
	page?: number;
	limit?: number;
}

/**
 * Fetches public replies for a comment (no auth, no userVote)
 *
 * @param raffleId - The raffle ID
 * @param commentId - The parent comment ID
 * @param params - Pagination options
 * @returns ServiceResponse with paginated replies or error code
 */
export async function getCommentReplies(
	raffleId: string,
	commentId: string,
	params?: GetCommentRepliesParams,
): Promise<ServiceResponse<ListCommentsResponse, CommentErrorCode>> {
	try {
		const response = await baseClient.get(
			`/raffles/${raffleId}/comments/${commentId}/replies`,
			{ params },
		);
		return success(listCommentsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'comment', 'get-comment-replies');
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
