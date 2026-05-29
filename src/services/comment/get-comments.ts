'use server';

import { baseClient } from '@/lib/api/client';
import { callService } from '@/lib/api/call-service';
import { pathParam } from '@/lib/utils/routing/path-param';
import { mapCommentError } from '@/lib/errors';
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
	return callService({
		client: baseClient,
		method: 'get',
		url: `/raffles/${pathParam(raffleId)}/comments`,
		schema: listCommentsResponseSchema,
		domain: 'comment',
		action: 'get-comments',
		driftCode: COMMENT_ERROR_CODES.FETCH_FAILED,
		mapError: mapCommentError,
		config: { params },
	});
}
