'use server';

import { runAfter } from '@/lib/run-after';
import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { revalidateMyRaffles } from '@/lib/cache/revalidation';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
	const sessionPromise = Promise.resolve(getSession());

	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/unpublish`,
		);

		const validatedData = raffleSchema.parse(response.data);

		runAfter(async () => {
			revalidateMyRaffles();

			const userId = (await sessionPromise)?.user?.id;
			await trackServer(
				RAFFLE_EVENTS.UNPUBLISHED,
				{ raffle_id: validatedData.id },
				{ userId },
			);
		});

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'unpublish-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
