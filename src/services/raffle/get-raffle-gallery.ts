'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { cachedBaseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type RaffleGalleryResponse,
	raffleGalleryResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches raffle gallery images with expiration-aware caching.
 *
 * Uses Next.js 'use cache' with a fixed 5-minute cache since URLs are now
 * plain strings. Pagination is supported but the current UI shows only the
 * first 3 images.
 *
 * @param raffleId - UUID of the raffle
 * @param limit - Optional pagination limit
 * @param page - Optional page number
 * @returns ServiceResponse with gallery URLs on success, RaffleErrorCode on failure
 */
export async function getRaffleGallery(
	raffleId: string,
	limit?: number,
	page?: number,
): Promise<ServiceResponse<RaffleGalleryResponse, RaffleErrorCode>> {
	'use cache';

	try {
		// Step 1: Fetch gallery images — pagination supported, current UI shows first 3
		const response = await cachedBaseClient.get(
			`/raffles/${pathParam(raffleId)}/gallery`,
			{
				params: {
					...(limit ? { limit } : undefined),
					...(page ? { page } : undefined),
				},
			},
		);

		// Step 2: Validate response shape
		const validatedData = raffleGalleryResponseSchema.parse(response.data);

		// Step 3: Cache for 5 minutes — URLs are plain strings, not pre-signed
		// revalidate: 300s (5min), expire: 360s (6min)
		cacheLife({ stale: 0, revalidate: 300, expire: 360 });

		return success(validatedData);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle-gallery');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
