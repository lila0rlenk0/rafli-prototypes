'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { cachedBaseClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type FeaturedRafflesResponse,
	featuredRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches admin-curated featured raffles for the browse page hero section.
 * Returns 0-2 live raffles ordered by most recently featured.
 *
 * Cached briefly — the list is admin-curated and the browse hero re-renders for
 * every visitor, so even a 60-second cache eliminates a hot read path.
 *
 * @returns ServiceResponse with featured raffles on success, RaffleErrorCode on failure
 */
export async function getFeaturedRaffles(): Promise<
	ServiceResponse<FeaturedRafflesResponse, RaffleErrorCode>
> {
	'use cache';

	try {
		const response = await cachedBaseClient.get('/raffles/featured');
		const validatedData = featuredRafflesResponseSchema.parse(response.data);

		// stale 30s, revalidate at 60s, hard expire at 120s — short window so
		// a newly featured raffle appears on the hero within ~1 minute.
		cacheLife({ stale: 30, revalidate: 60, expire: 120 });

		return success(validatedData);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-featured-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
