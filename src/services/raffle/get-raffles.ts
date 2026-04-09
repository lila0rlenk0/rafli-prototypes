'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches all raffles with optional filtering (public/browsing)
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getRaffles(
	query?: MyRafflesQuery,
): Promise<ServiceResponse<ListRafflesResponse, RaffleErrorCode>> {
	try {
		const response = await baseClient.get('/raffles', {
			params: buildQueryParams(query),
		});
		return success(listRafflesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
