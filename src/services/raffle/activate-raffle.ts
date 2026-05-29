'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { revalidateMyRaffles } from '@/lib/cache/revalidation';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Activates a queued raffle, transitioning it to live immediately.
 * Sets startAt to now so the raffle goes live without waiting for the cron.
 *
 * @param raffleId - The ID of the raffle to activate
 * @returns ServiceResponse with updated raffle on success, RaffleErrorCode on failure
 */
export async function activateRaffle(
	raffleId: string,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	try {
		// Step 1: Activate queued raffle — sets startAt to now, transitions to live
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/activate`,
		);

		// Step 2: Validate response shape
		const raffle = raffleSchema.parse(response.data);

		// Step 3: Revalidate my-raffles cache so host dashboard reflects new status
		// Revalidation target: MY_RAFFLES tag
		runAfter(() => {
			revalidateMyRaffles();
		});

		return success(raffle);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'activate-raffle');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		return failure(mapRaffleError(error));
	}
}
