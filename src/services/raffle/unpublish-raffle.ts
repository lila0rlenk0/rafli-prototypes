'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
import { revalidateMyRaffles } from '@/lib/cache/revalidation';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Reverts a queued raffle back to draft so the host can edit it.
 * Only queued raffles (no participants yet) can be unpublished.
 *
 * @param raffleId - The ID of the raffle to unpublish
 * @returns ServiceResponse with updated raffle (now draft) on success, RaffleErrorCode on failure
 */
export async function unpublishRaffle(
	raffleId: string,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	const sessionPromise = getSession();

	try {
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/unpublish`,
		);

		const raffle = raffleSchema.parse(response.data);

		runAfter(() => {
			revalidateMyRaffles();
		});

		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			RAFFLE_EVENTS.UNPUBLISHED,
			{ raffle_id: raffle.id },
			{ userId },
		);

		return success(raffle);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'unpublish-raffle');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		return failure(mapRaffleError(error));
	}
}
