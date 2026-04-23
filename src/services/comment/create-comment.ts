'use server';

import { pathParam } from '@/lib/utils/routing/path-param';
import type { Comment, CreateCommentPayload } from '@/types/comment';
import type { CommentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

import { createCommentBase } from './create-comment-base';

/**
 * Creates a top-level comment on a raffle.
 *
 * Thin wrapper over `createCommentBase` — resolves the comments endpoint
 * and the `create-comment` telemetry tag, then delegates the shared
 * POST → Zod parse → analytics pipeline. Public signature is preserved so
 * React Query hooks (`use-create-comment`) import unchanged.
 *
 * @param raffleId - The raffle ID
 * @param payload - Comment body text
 * @returns ServiceResponse with created comment or error code
 */
export async function createComment(
	raffleId: string,
	payload: CreateCommentPayload,
): Promise<ServiceResponse<Comment, CommentErrorCode>> {
	return createCommentBase({
		raffleId,
		endpoint: `/raffles/${pathParam(raffleId)}/comments`,
		payload,
		action: 'create-comment',
	});
}
