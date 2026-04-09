'use server';

import { ZodError } from 'zod';

import { COMMENT_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, mapCommentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
	const sessionPromise = Promise.resolve(getSession());

	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/comments`,
			payload,
		);
		const validated = commentSchema.parse(response.data);

		// Fire-and-forget — don't block comment UX
		void sessionPromise.then(session =>
			trackServer(
				COMMENT_EVENTS.CREATED,
				{
					raffle_id: raffleId,
					comment_id: validated.id,
					is_reply: false,
					body_length: payload.body.length,
				},
				{ userId: session?.user?.id },
			),
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'comment', 'create-comment');
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
