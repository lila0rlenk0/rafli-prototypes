'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapCommentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import type { CommentSort } from '@/types/comment';
import {
	listCommentsResponseSchema,
	type ListCommentsResponse,
} from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/** Params for fetching authenticated top-level comments */
interface GetMyCommentsParams {
	page?: number;
	limit?: number;
	sort?: CommentSort;
}

/**
 * Fetches top-level comments with userVote enrichment (requires auth)
 *
 * Uses /me/ prefix to get the current user's vote state on each comment.
 *
 * @param raffleId - The raffle ID
 * @param params - Pagination and sort options
 * @returns ServiceResponse with paginated comments (including userVote) or error code
 */
export async function getMyComments(
	raffleId: string,
	params?: GetMyCommentsParams,
): Promise<ServiceResponse<ListCommentsResponse, CommentErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/me/raffles/${raffleId}/comments`,
			{ params },
		);
		return success(listCommentsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'comment', 'get-my-comments');
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
