'use server';

import { runAfter } from '@/lib/run-after';
import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
	const sessionPromise = Promise.resolve(getSession());

	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/publish`,
		);

		// Validate response data structure
		const validatedData = raffleSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				RAFFLE_EVENTS.PUBLISHED,
				{
					raffle_id: validatedData.id,
					category_id: validatedData.categoryId,
					ticket_price: validatedData.ticketPriceAmount,
					max_participants: validatedData.maxParticipants,
					number_of_winners: validatedData.numberOfWinners,
				},
				{ userId },
			);
		});

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'publish-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
