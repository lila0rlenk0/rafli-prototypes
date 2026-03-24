'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { revalidateMyRaffles } from '@/lib/cache/revalidation';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

type UnpublishRaffleResponse = ServiceResponse<Raffle, RaffleErrorCode>;

/**
 * Reverts a queued raffle back to draft so the host can edit it.
 * Only queued raffles (no participants yet) can be unpublished.
 *
 * @param raffleId - The ID of the raffle to unpublish
 * @returns ServiceResponse with updated raffle (now draft) on success, RaffleErrorCode on failure
 */
export async function unpublishRaffle(
	raffleId: string,
): Promise<UnpublishRaffleResponse> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/unpublish`,
		);

		const validatedData = raffleSchema.parse(response.data);

		// Revalidate my-raffles so the card reflects the reverted draft status
		revalidateMyRaffles();

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Unpublish raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
