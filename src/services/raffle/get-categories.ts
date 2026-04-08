'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	type CategoriesResponse,
	categoriesResponseSchema,
} from '@/types/category';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching categories
 */
type GetCategoriesResponse = ServiceResponse<
	CategoriesResponse,
	RaffleErrorCode
>;

/**
 * Fetches available categories from the backend (public endpoint)
 *
 * @returns ServiceResponse with categories list on success, RaffleErrorCode on failure
 */
export async function getCategories(): Promise<GetCategoriesResponse> {
	try {
		const response = await baseClient.get('/categories');

		// Validate response data structure
		const validatedData = categoriesResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-categories');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
