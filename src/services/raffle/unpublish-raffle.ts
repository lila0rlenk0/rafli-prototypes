'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
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
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/unpublish`,
		);

		const validatedData = raffleSchema.parse(response.data);

		// Revalidate my-raffles so the card reflects the reverted draft status
		revalidateMyRaffles();

		// Fire-and-forget — unpublish is not revenue-critical
		void trackServer(
			RAFFLE_EVENTS.UNPUBLISHED,
			{ raffle_id: validatedData.id },
			{ userId },
		);

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
