'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Publishes a draft raffle, transitioning it to queued or live status.
 *
 * Status is determined by the raffle's startAt date:
 * - startAt <= now → 'live'
 * - startAt > now → 'queued' (cron activates it later)
 *
 * @param raffleId - The ID of the raffle to publish
 * @returns ServiceResponse with updated raffle on success, RaffleErrorCode on failure
 */
export async function publishRaffle(
	raffleId: string,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Publish draft — backend transitions to queued or live based on startAt
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/publish`,
		);

		// Step 2: Validate response shape
		const raffle = raffleSchema.parse(response.data);

		// Step 3: Non-blocking publish analytics
		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			RAFFLE_EVENTS.PUBLISHED,
			{
				raffle_id: raffle.id,
				category_id: raffle.categoryId,
				ticket_price: raffle.ticketPriceAmount,
				max_participants: raffle.maxParticipants,
				number_of_winners: raffle.numberOfWinners,
			},
			{ userId },
		);

		return success(raffle);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'publish-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
