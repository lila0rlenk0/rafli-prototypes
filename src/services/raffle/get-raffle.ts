'use server';

import type { AxiosInstance } from 'axios';
import { cacheLife, cacheTag } from 'next/cache';
import { ZodError } from 'zod';

import { authenticatedClient, cachedBaseClient } from '@/lib/api/client';
import { CACHE_REVALIDATE, raffleDetailTag } from '@/lib/api/constants';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Shared fetch + error mapping for the cached and authed paths. Splitting only
 * by client + cache directives keeps error handling in one place.
 */
async function fetchRaffle(
	client: AxiosInstance,
	publicSlug: string,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	try {
		const response = await client.get(`/raffles/${pathParam(publicSlug)}`);
		return success(raffleSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapRaffleError(error));
	}
}

/**
 * Cached public read by slug. Tagged by both id (post-fetch) and slug so
 * `revalidateRaffleDetail(id)` and `revalidateRaffleDetail(id, slug)` both
 * clear it.
 */
async function getRaffleCached(
	publicSlug: string,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	'use cache';

	const result = await fetchRaffle(cachedBaseClient, publicSlug);

	if (result.success) {
		cacheTag(raffleDetailTag(result.data.id), raffleDetailTag(publicSlug));
		// Narrow SWR window — ticket counts on the detail page must stay current.
		cacheLife({
			stale: 60,
			revalidate: CACHE_REVALIDATE.RAFFLE_DETAIL,
			expire: 600,
		});
	} else {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });
	}

	return result;
}

/**
 * Fetches a single raffle by public slug.
 *
 * `authed: true` uses `authenticatedClient` so the backend can enrich
 * user-scoped fields (e.g. `xShareClaim`) and skips the data cache because the
 * response varies per session. Otherwise the public payload is served from
 * `'use cache'`. The caller resolves auth itself — this action does not read
 * cookies.
 *
 * @param publicSlug - The public slug of the raffle to fetch
 * @param options - Set `authed: true` for the per-user enriched payload
 * @returns ServiceResponse with raffle on success, RaffleErrorCode on failure
 */
export async function getRaffle(
	publicSlug: string,
	options?: { authed?: boolean },
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	if (options?.authed) {
		return fetchRaffle(authenticatedClient, publicSlug);
	}
	return getRaffleCached(publicSlug);
}
