'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapReviewError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { REVIEW_ERROR_CODES, type ReviewErrorCode } from '@/types/errors';
import {
	type CheckReviewResponse,
	checkReviewResponseSchema,
} from '@/types/review';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Checks if the current user can review a raffle.
 *
 * @param raffleId - The UUID of the raffle to check
 * @returns ServiceResponse with eligibility data on success, ReviewErrorCode on failure
 */
export async function checkReview(
	raffleId: string,
): Promise<ServiceResponse<CheckReviewResponse, ReviewErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${pathParam(raffleId)}/review`,
		);
		return success(checkReviewResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'review', 'check-review');
			return failure(REVIEW_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapReviewError(error));
	}
}
