'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type RaffleCoverResponse,
	raffleCoverResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches raffle cover image with expiration-aware caching.
 *
 * Uses Next.js 'use cache' directive with a fixed 5-minute cache since
 * cover URLs are now plain strings rather than pre-signed URLs.
 *
 * @param raffleId - UUID of the raffle
 * @returns ServiceResponse with cover URL and expiration on success, RaffleErrorCode on failure
 */
export async function getRaffleCover(
	raffleId: string,
): Promise<ServiceResponse<RaffleCoverResponse, RaffleErrorCode>> {
	'use cache';

	try {
		// Step 1: Fetch cover image URL from backend
		const response = await baseClient.get(
			`/raffles/${pathParam(raffleId)}/cover`,
		);

		// Step 2: Validate response shape
		const validatedData = raffleCoverResponseSchema.parse(response.data);

		// Step 3: Cache for 5 minutes — URLs are plain strings, not pre-signed
		// revalidate: 300s (5min), expire: 360s (6min)
		cacheLife({ stale: 0, revalidate: 300, expire: 360 });

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle-cover');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
