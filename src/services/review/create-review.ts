'use server';

import { ZodError } from 'zod';

import { REVIEW_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
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
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post('/reviews', payload);

		const validated = reviewSchema.parse(response.data);

		// Fire-and-forget — don't block review submission
		void trackServer(
			REVIEW_EVENTS.CREATED,
			{
				raffle_id: payload.raffleId,
				host_id: payload.hostId,
				rating: payload.rating,
			},
			{ userId },
		);

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
