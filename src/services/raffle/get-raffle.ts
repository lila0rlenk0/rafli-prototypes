'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching a single raffle
 */
type GetRaffleResponse = ServiceResponse<Raffle, RaffleErrorCode>;

/**
 * Fetches a single raffle by public slug
 *
 * @param publicSlug - The public slug of the raffle to fetch
 * @returns ServiceResponse with raffle on success, RaffleErrorCode on failure
 */
export async function getRaffle(publicSlug: string): Promise<GetRaffleResponse> {
	try {
		const response = await baseClient.get(`/raffles/${publicSlug}`);

		const validatedData = raffleSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
