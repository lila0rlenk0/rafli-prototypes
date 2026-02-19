'use client';

import { useMutation } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ReviewErrorCode } from '@/types/errors';
import type { CreateReviewPayload, Review } from '@/types/review';

import { createReview } from './create-review';

/**
 * Mutation hook for creating a host review
 * @returns React Query mutation result
 */
export function useCreateReview() {
	return useMutation<
		Review,
		ServiceError<ReviewErrorCode>,
		CreateReviewPayload
	>({
		mutationFn: async function submitReview(payload: CreateReviewPayload) {
			const result = await createReview(payload);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
	});
}
