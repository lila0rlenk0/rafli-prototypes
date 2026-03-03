'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { CommentErrorCode } from '@/types/errors';

import { deleteComment } from './delete-comment';

/**
 * Mutation hook for soft-deleting a comment
 *
 * Invalidates all comment queries on success — both top-level lists
 * and reply lists — since the deleted comment could be either.
 *
 * @returns React Query mutation result
 */
export function useDeleteComment() {
	const queryClient = useQueryClient();

	return useMutation<void, ServiceError<CommentErrorCode>, string>({
		mutationFn: async function remove(commentId: string) {
			const result = await deleteComment(commentId);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess() {
			// Invalidate entire comment domain — covers both lists and replies
			queryClient.invalidateQueries({ queryKey: ['comment'] });
		},
	});
}
