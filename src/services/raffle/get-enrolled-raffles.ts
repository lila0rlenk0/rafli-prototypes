'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParamsWithStatus } from '@/lib/api/utils';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type EnrolledRafflesQuery,
	type ListEnrolledRafflesResponse,
	listEnrolledRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Fetches raffles the user has enrolled in (participant mode)
 *
 * @param query - Optional query parameters for filtering enrolled raffles
 * @returns ServiceResponse with enrolled raffle list on success, RaffleErrorCode on failure
 */
export async function getEnrolledRaffles(
	query?: EnrolledRafflesQuery,
): Promise<ServiceResponse<ListEnrolledRafflesResponse, RaffleErrorCode>> {
	try {
		const response = await authenticatedClient.get('/me/enrolled-raffles', {
			params: buildQueryParamsWithStatus(query),
		});
		return success(listEnrolledRafflesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-enrolled-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
