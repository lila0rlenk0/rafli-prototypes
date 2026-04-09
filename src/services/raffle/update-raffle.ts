'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { Raffle, UpdateRafflePayload } from '@/types/raffle';
import { raffleSchema, updateRafflePayloadSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Updates an existing draft raffle.
 * Only sends changed fields (partial update). Backend restricts updates to draft raffles only.
 *
 * @param raffleId - The ID of the raffle to update
 * @param payload - Partial update payload with only changed fields
 * @returns ServiceResponse with updated raffle on success, RaffleErrorCode on failure
 */
export async function updateRaffle(
	raffleId: string,
	payload: UpdateRafflePayload,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Validate payload — reject malformed updates before network call
		const validationResult = updateRafflePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		// Step 2: Guard — no-op if caller passed an empty diff
		if (Object.keys(validationResult.data).length === 0) {
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		// Step 3: Send partial update — backend restricts to draft raffles only
		const response = await authenticatedClient.put(
			`/raffles/${raffleId}`,
			validationResult.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 4: Validate response shape
		const raffle = raffleSchema.parse(response.data);

		// Step 5: Fire-and-forget analytics — update is frequent, don't block
		void sessionPromise.then(session =>
			trackServer(
				RAFFLE_EVENTS.UPDATED,
				{
					raffle_id: raffle.id,
					fields_changed: Object.keys(validationResult.data),
				},
				{ userId: session?.user?.id },
			),
		);

		return success(raffle);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'update-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
