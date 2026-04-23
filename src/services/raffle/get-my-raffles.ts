'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParamsWithStatus } from '@/lib/api/query-params';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Fetches the current user's raffles with optional filtering
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getMyRaffles(
	query?: MyRafflesQuery,
): Promise<ServiceResponse<ListRafflesResponse, RaffleErrorCode>> {
	try {
		const response = await authenticatedClient.get('/me/raffles', {
			params: buildQueryParamsWithStatus(query),
		});
		return success(listRafflesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-my-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
