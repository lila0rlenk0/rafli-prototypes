'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { cachedBaseClient } from '@/lib/api/client';
import { CACHE_REVALIDATE } from '@/lib/api/constants';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	type CategoriesResponse,
	categoriesResponseSchema,
} from '@/types/category';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches available categories from the backend (public endpoint).
 *
 * Cached aggressively — categories are near-static (admin-curated, rarely edited)
 * and the same list is rendered on browse, edit, and detail surfaces. Avoiding
 * the round-trip on every request is the cheapest perf win.
 *
 * @returns ServiceResponse with categories list on success, RaffleErrorCode on failure
 */
export async function getCategories(): Promise<
	ServiceResponse<CategoriesResponse, RaffleErrorCode>
> {
	'use cache';

	try {
		const response = await cachedBaseClient.get('/categories');
		const validated = categoriesResponseSchema.parse(response.data);

		// Categories are near-static admin data — longer windows are safe.
		cacheLife({
			stale: 300,
			revalidate: CACHE_REVALIDATE.CATEGORIES,
			expire: 7_200,
		});

		return success(validated);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-categories');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
