'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for publishing a raffle
 */
type PublishRaffleResponse = ServiceResponse<Raffle, RaffleErrorCode>;

/**
 * Publishes a draft raffle, transitioning it to queued or live status
 *
 * Status is determined by the raffle's startAt date:
 * - If startAt <= now: status becomes 'live'
 * - If startAt > now: status becomes 'queued' (cron will activate it later)
 *
 * @param raffleId - The ID of the raffle to publish
 * @returns ServiceResponse with updated raffle on success, RaffleErrorCode on failure
 */
export async function publishRaffle(
	raffleId: string,
): Promise<PublishRaffleResponse> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/publish`,
		);

		// Validate response data structure
		const validatedData = raffleSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('Publish raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
