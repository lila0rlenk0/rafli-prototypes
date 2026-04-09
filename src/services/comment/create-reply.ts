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
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Submit reply to backend (single nesting level enforced by backend)
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/comments/${commentId}/replies`,
			payload,
		);

		// Step 2: Validate response shape against schema
		const validated = commentSchema.parse(response.data);

		// Step 3: Fire-and-forget analytics — don't block reply UX
		void sessionPromise.then(session =>
			trackServer(
				COMMENT_EVENTS.CREATED,
				{
					raffle_id: raffleId,
					comment_id: validated.id,
					parent_comment_id: commentId,
					is_reply: true,
					body_length: payload.body.length,
				},
				{ userId: session?.user?.id },
			),
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'comment', 'create-reply');
			return failure(COMMENT_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapCommentError(error));
	}
}
