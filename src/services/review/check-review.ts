'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapReviewError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { REVIEW_ERROR_CODES, type ReviewErrorCode } from '@/types/errors';
import {
	type CheckReviewResponse,
	checkReviewResponseSchema,
} from '@/types/review';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for checking review eligibility
 */
type CheckReviewServiceResponse = ServiceResponse<
	CheckReviewResponse,
	ReviewErrorCode
>;

/**
 * Checks if the current user can review a raffle
 *
 * @param raffleId - The UUID of the raffle to check
 * @returns ServiceResponse with eligibility data on success, ReviewErrorCode on failure
 */
export async function checkReview(
	raffleId: string,
): Promise<CheckReviewServiceResponse> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${raffleId}/review`,
		);

		const validated = checkReviewResponseSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'review', 'check-review');
			return failure(REVIEW_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapReviewError(error);
		return failure(errorCode);
	}
}
