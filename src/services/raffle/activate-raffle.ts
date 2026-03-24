'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { revalidateMyRaffles } from '@/lib/cache/revalidation';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for activating a raffle
 */
type ActivateRaffleResponse = ServiceResponse<Raffle, RaffleErrorCode>;

/**
 * Activates a queued raffle, transitioning it to live immediately.
 * Sets startAt to now so the raffle goes live without waiting for the cron.
 *
 * @param raffleId - The ID of the raffle to activate
 * @returns ServiceResponse with updated raffle on success, RaffleErrorCode on failure
 */
export async function activateRaffle(
	raffleId: string,
): Promise<ActivateRaffleResponse> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/activate`,
		);

		const validatedData = raffleSchema.parse(response.data);

		// Revalidate my-raffles so the card reflects the new live status
		revalidateMyRaffles();

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Activate raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
