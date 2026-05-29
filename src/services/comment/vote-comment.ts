'use server';

import { ZodError } from 'zod';

import { COMMENT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
import { failure, mapCommentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
	const sessionPromise = getSession();

	try {
		// Step 1: Submit vote — backend toggles: same direction twice removes the vote
		const response = await authenticatedClient.post(
			`/comments/${pathParam(commentId)}/vote`,
			{ voteType: type },
		);

		// Step 2: Validate response shape
		const validated = voteResponseSchema.parse(response.data);

		// Step 3: Must `await` trackAfter — it resolves IP via headers() in
		// request scope then defers Mixpanel via after(). `void trackAfter(...)`
		// would run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			COMMENT_EVENTS.VOTED,
			{ comment_id: commentId, direction: type },
			{ userId: session?.user?.id },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'comment', 'vote-comment');
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
