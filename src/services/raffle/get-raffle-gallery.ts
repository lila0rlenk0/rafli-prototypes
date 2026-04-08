'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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

		// URLs are now plain strings — use fixed 5-minute cache
		cacheLife({ stale: 0, revalidate: 300, expire: 360 });

		return success(validatedData);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle-gallery');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
