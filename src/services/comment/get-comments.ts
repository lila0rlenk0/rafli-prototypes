'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapCommentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import type { CommentSort } from '@/types/comment';
import {
	listCommentsResponseSchema,
	type ListCommentsResponse,
} from '@/types/comment';
import { COMMENT_ERROR_CODES, type CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/** Params for fetching top-level comments */
interface GetCommentsParams {
	page?: number;
	limit?: number;
	sort?: CommentSort;
}

/**
 * Fetches public top-level comments for a raffle (no auth, no userVote)
 *
 * @param raffleId - The raffle ID
 * @param params - Pagination and sort options
 * @returns ServiceResponse with paginated comments or error code
 */
export async function getComments(
	raffleId: string,
	params?: GetCommentsParams,
): Promise<ServiceResponse<ListCommentsResponse, CommentErrorCode>> {
	try {
		const response = await baseClient.get(
			`/raffles/${pathParam(raffleId)}/comments`,
			{ params },
		);
		return success(listCommentsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'comment', 'get-comments');
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
