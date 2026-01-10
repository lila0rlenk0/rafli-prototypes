'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
	RAFFLE_STATUS,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching user's raffles list
 */
type GetMyRafflesResponse = ServiceResponse<
	ListRafflesResponse,
	RaffleErrorCode
>;

/**
 * Fetches the current user's raffles with optional filtering
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getMyRaffles(
	query?: MyRafflesQuery,
): Promise<GetMyRafflesResponse> {
	try {
		// Build query params with default status (edge case: custom default value)
		const params = buildQueryParams({
			...query,
			status: query?.status || RAFFLE_STATUS.DRAFT,
		});

		const response = await authenticatedClient.get('/me/raffles', {
			params,
		});

		// Validate response data structure
		const validatedData = listRafflesResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('My raffles response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
