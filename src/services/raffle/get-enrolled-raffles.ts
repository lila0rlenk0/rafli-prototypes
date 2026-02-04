'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParamsWithStatus } from '@/lib/api/utils';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type EnrolledRafflesQuery,
	type ListEnrolledRafflesResponse,
	listEnrolledRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching user's enrolled raffles list
 */
type GetEnrolledRafflesResponse = ServiceResponse<
	ListEnrolledRafflesResponse,
	RaffleErrorCode
>;

/**
 * Fetches raffles the user has enrolled in (participant mode)
 *
 * @param query - Optional query parameters for filtering enrolled raffles
 * @returns ServiceResponse with enrolled raffle list on success, RaffleErrorCode on failure
 */
export async function getEnrolledRaffles(
	query?: EnrolledRafflesQuery,
): Promise<GetEnrolledRafflesResponse> {
	try {
		const params = buildQueryParamsWithStatus(query);

		const response = await authenticatedClient.get('/me/enrolled-raffles', {
			params,
		});

		// Validate response data structure
		const validatedData = listEnrolledRafflesResponseSchema.parse(
			response.data,
		);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('Enrolled raffles response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
