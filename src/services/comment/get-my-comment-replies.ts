'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapCommentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	listCommentsResponseSchema,
	type ListCommentsResponse,
} from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/** Params for fetching authenticated replies */
interface GetMyCommentRepliesParams {
	page?: number;
	limit?: number;
}

/**
 * Fetches replies with userVote enrichment (requires auth)
 *
 * Uses /me/ prefix to get the current user's vote state on each reply.
 *
 * @param raffleId - The raffle ID
 * @param commentId - The parent comment ID
 * @param params - Pagination options
 * @returns ServiceResponse with paginated replies (including userVote) or error code
 */
export async function getMyCommentReplies(
	raffleId: string,
	commentId: string,
	params?: GetMyCommentRepliesParams,
): Promise<ServiceResponse<ListCommentsResponse, CommentErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/me/raffles/${raffleId}/comments/${commentId}/replies`,
			{ params },
		);
		return success(listCommentsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'comment', 'get-my-comment-replies');
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
