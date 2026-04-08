'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type FeaturedRafflesResponse,
	featuredRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches admin-curated featured raffles for the browse page hero section.
 * Returns 0-2 live raffles ordered by most recently featured.
 *
 * @returns ServiceResponse with featured raffles on success, RaffleErrorCode on failure
 */
export async function getFeaturedRaffles(): Promise<
	ServiceResponse<FeaturedRafflesResponse, RaffleErrorCode>
> {
	try {
		const response = await baseClient.get('/raffles/featured');
		const validatedData = featuredRafflesResponseSchema.parse(response.data);
		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-featured-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
