'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches a single raffle by public slug
 *
 * @param publicSlug - The public slug of the raffle to fetch
 * @returns ServiceResponse with raffle on success, RaffleErrorCode on failure
 */
export async function getRaffle(
	publicSlug: string,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	try {
		const response = await baseClient.get(`/raffles/${publicSlug}`);
		return success(raffleSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
