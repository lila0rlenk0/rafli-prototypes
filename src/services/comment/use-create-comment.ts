'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { Comment, CreateCommentPayload } from '@/types/comment';
import type { CommentErrorCode } from '@/types/errors';

import { createComment } from './create-comment';
import { createReply } from './create-reply';

/** Mutation payload — parentId present = reply, absent = top-level comment */
interface CreateCommentVariables {
	raffleId: string;
	payload: CreateCommentPayload;
	/** When set, creates a reply instead of a top-level comment */
	parentId?: string;
}

/**
 * Mutation hook for creating comments and replies
 *
 * Invalidates the appropriate query key based on whether it's a
 * top-level comment or a reply:
 * - Top-level: invalidates all comment lists for the raffle
 * - Reply: additionally invalidates the parent's replies cache
 *
 * @returns React Query mutation result
 */
export function useCreateComment() {
	const queryClient = useQueryClient();

	return useMutation<
		Comment,
		ServiceError<CommentErrorCode>,
		CreateCommentVariables
	>({
		mutationFn: async function create(variables: CreateCommentVariables) {
			// parentId present → reply, absent → top-level comment
			const result = variables.parentId
				? await createReply(
						variables.raffleId,
						variables.parentId,
						variables.payload,
					)
				: await createComment(variables.raffleId, variables.payload);

			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess(_data, variables) {
			// Always invalidate top-level list — total count may change even for replies
			queryClient.invalidateQueries({
				queryKey: ['comment', 'list', variables.raffleId],
			});

			// Also invalidate parent's replies cache when creating a reply
			if (variables.parentId) {
				queryClient.invalidateQueries({
					queryKey: ['comment', 'replies', variables.parentId],
				});
			}
		},
	});
}
