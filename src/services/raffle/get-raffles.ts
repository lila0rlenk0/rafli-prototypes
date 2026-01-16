'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { calculateMinCacheLife } from '@/lib/cache/calculate-revalidate';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching raffles list
 */
type GetRafflesResponse = ServiceResponse<ListRafflesResponse, RaffleErrorCode>;

/**
 * Fetches all raffles with optional filtering (public/browsing)
 *
 * Uses Next.js 16 'use cache' directive with dynamic cache duration
 * based on the earliest expiring image URL across all raffles.
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getRaffles(
	query?: MyRafflesQuery,
): Promise<GetRafflesResponse> {
	'use cache';

	try {
		const params = buildQueryParams(query);

		const response = await baseClient.get('/raffles', {
			params,
		});

		// Validate response data structure
		const validatedData = listRafflesResponseSchema.parse(response.data);

		// Calculate cache duration from images
		// IMPORTANT: stale must be 0 for pre-signed URLs - they cannot be served stale
		if (validatedData.raffles.length > 0) {
			const allExpirations: string[] = [];

			validatedData.raffles.forEach(raffle => {
				if (raffle.coverMediaUrl) {
					allExpirations.push(raffle.coverMediaUrl.expiresAt);
				}
				raffle.galleryMediaUrls.forEach(img => {
					allExpirations.push(img.expiresAt);
				});
			});

			const cacheConfig = calculateMinCacheLife(allExpirations);
			cacheLife(cacheConfig);
		} else {
			// No raffles - cache for 5 minutes, stale: 0 for consistency
			cacheLife({ stale: 0, revalidate: 300, expire: 360 });
		}

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('Raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
