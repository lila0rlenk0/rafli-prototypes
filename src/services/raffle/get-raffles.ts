'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching raffles list
 */
type GetRafflesResponse = ServiceResponse<ListRafflesResponse, RaffleErrorCode>;

/**
 * Fetches all raffles with optional filtering (public/browsing)
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getRaffles(
	query?: MyRafflesQuery,
): Promise<GetRafflesResponse> {
	try {
		const params = buildQueryParams(query);

		const response = await baseClient.get('/raffles', {
			params,
		});

		// Validate response data structure
		const validatedData = listRafflesResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('Raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
