'use server';

import { ZodError } from 'zod';

import { REVIEW_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, mapReviewError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { REVIEW_ERROR_CODES, type ReviewErrorCode } from '@/types/errors';
import {
	type CreateReviewPayload,
	type Review,
	reviewSchema,
} from '@/types/review';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Creates a review for a raffle host.
 *
 * @param payload - The review data including raffleId, hostId, rating, and optional comment
 * @returns ServiceResponse with created review on success, ReviewErrorCode on failure
 */
export async function createReview(
	payload: CreateReviewPayload,
): Promise<ServiceResponse<Review, ReviewErrorCode>> {
	const sessionPromise = getSession();

	try {
		// Step 1: Submit review to backend
		const response = await authenticatedClient.post('/reviews', payload);

		// Step 2: Validate response shape
		const validated = reviewSchema.parse(response.data);

		// Step 3: Must `await` trackAfter — it resolves IP via headers() in
		// request scope then defers Mixpanel via after(). `void trackAfter(...)`
		// would run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			REVIEW_EVENTS.CREATED,
			{
				raffle_id: payload.raffleId,
				host_id: payload.hostId,
				rating: payload.rating,
				has_comment: !!payload.comment,
			},
			{ userId: session?.user?.id },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'review', 'create-review');
			return failure(REVIEW_ERROR_CODES.CREATE_FAILED);
		}

		const errorCode = mapReviewError(error);
		return failure(errorCode);
	}
}
