'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { calculateMinRevalidateTime } from '@/lib/cache/calculate-revalidate';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type RaffleGalleryResponse,
	raffleGalleryResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching raffle gallery images
 */
type GetRaffleGalleryResponse = ServiceResponse<
	RaffleGalleryResponse,
	RaffleErrorCode
>;

/**
 * Fetches raffle gallery images with expiration-aware caching
 *
 * Uses Next.js 16 'use cache' directive with dynamic cache duration
 * based on the earliest expiring pre-signed URL in the gallery.
 *
 * Note: Pagination is supported but not used initially.
 * Current UI shows only first 3 images.
 *
 * @param raffleId - UUID of the raffle
 * @param limit - Optional pagination limit
 * @param page - Optional page number
 * @returns ServiceResponse with gallery URLs and expirations on success, RaffleErrorCode on failure
 */
export async function getRaffleGallery(
	raffleId: string,
	limit?: number,
	page?: number,
): Promise<GetRaffleGalleryResponse> {
	'use cache';

	try {
		const params: Record<string, unknown> = {};
		if (limit) params.limit = limit;
		if (page) params.page = page;

		const response = await baseClient.get(`/raffles/${raffleId}/gallery`, {
			params,
		});

		// Validate response structure
		const validatedData = raffleGalleryResponseSchema.parse(response.data);

		// Set cache based on earliest expiring image
		if (validatedData.gallery.length > 0) {
			const expiresAtDates = validatedData.gallery.map(img => img.expiresAt);
			const revalidateSeconds = calculateMinRevalidateTime(expiresAtDates);
			cacheLife({ revalidate: revalidateSeconds });
		} else {
			// No gallery images - cache for 5 minutes
			cacheLife({ revalidate: 300 });
		}

		return success(validatedData);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			console.error('Gallery response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
