'use server';

import type { Comment, CreateCommentPayload } from '@/types/comment';
import type { CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

import { pathParam } from '@/lib/api/config';
import { createCommentBase } from './create-comment-base';

/**
 * Creates a reply to a comment.
 *
 * Single-level nesting only — replies cannot have their own replies (enforced
 * by the backend). Thin wrapper over `createCommentBase` — resolves the nested
 * replies endpoint and the `create-reply` telemetry tag, then delegates the
 * shared POST → Zod parse → analytics pipeline. Public signature is preserved
 * so React Query hooks (`use-create-comment`) import unchanged.
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
	return createCommentBase({
		raffleId,
		endpoint: `/raffles/${pathParam(raffleId)}/comments/${pathParam(commentId)}/replies`,
		payload,
		action: 'create-reply',
		parentCommentId: commentId,
	});
}
