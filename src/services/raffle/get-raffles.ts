'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { cachedBaseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/query-params';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches all raffles with optional filtering (public/browsing).
 *
 * Cached per-`query` — Next 16 derives the cache key from the serializable
 * argument, so each filter combination caches independently. Backend remains
 * authoritative for ticket counts, but a short SWR window is acceptable on the
 * browse list (the detail page is the source of truth before purchase).
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getRaffles(
	query?: MyRafflesQuery,
): Promise<ServiceResponse<ListRafflesResponse, RaffleErrorCode>> {
	'use cache';

	try {
		const response = await cachedBaseClient.get('/raffles', {
			params: buildQueryParams(query),
		});
		const validated = listRafflesResponseSchema.parse(response.data);

		// stale 30s, revalidate at 60s, hard expire at 120s — browse list
		// tolerates a brief lag; detail page enforces freshness on purchase.
		cacheLife({ stale: 30, revalidate: 60, expire: 120 });

		return success(validated);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
