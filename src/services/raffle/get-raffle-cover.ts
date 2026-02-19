'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type RaffleCoverResponse,
	raffleCoverResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching raffle cover image
 */
type GetRaffleCoverResponse = ServiceResponse<
	RaffleCoverResponse,
	RaffleErrorCode
>;

/**
 * Fetches raffle cover image with expiration-aware caching
 *
 * Uses Next.js 16 'use cache' directive with dynamic cache duration
 * based on the pre-signed URL expiration time.
 *
 * @param raffleId - UUID of the raffle
 * @returns ServiceResponse with cover URL and expiration on success, RaffleErrorCode on failure
 */
export async function getRaffleCover(
	raffleId: string,
): Promise<GetRaffleCoverResponse> {
	'use cache';

	try {
		const response = await baseClient.get(`/raffles/${raffleId}/cover`);

		// Validate response structure
		const validatedData = raffleCoverResponseSchema.parse(response.data);

		// URLs are now plain strings — use fixed 5-minute cache
		cacheLife({ stale: 0, revalidate: 300, expire: 360 });

		return success(validatedData);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			console.error('Cover response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
