'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapReviewError, success } from '@/lib/errors';
import { REVIEW_ERROR_CODES, type ReviewErrorCode } from '@/types/errors';
import {
	type CreateReviewPayload,
	type Review,
	reviewSchema,
} from '@/types/review';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for creating a review
 */
type CreateReviewServiceResponse = ServiceResponse<Review, ReviewErrorCode>;

/**
 * Creates a review for a raffle host
 *
 * @param payload - The review data including raffleId, hostId, rating, and optional comment
 * @returns ServiceResponse with created review on success, ReviewErrorCode on failure
 */
export async function createReview(
	payload: CreateReviewPayload,
): Promise<CreateReviewServiceResponse> {
	try {
		const response = await authenticatedClient.post('/reviews', payload);

		const validated = reviewSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Create review response validation failed:', error);
			return failure(REVIEW_ERROR_CODES.CREATE_FAILED);
		}

		const errorCode = mapReviewError(error);
		return failure(errorCode);
	}
}
