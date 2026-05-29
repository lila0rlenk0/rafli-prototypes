'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { CACHE_TAGS } from '@/lib/api/constants';
import { buildQueryParamsWithStatus } from '@/lib/api/query-params';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	COMMON_ERROR_CODES,
	RAFFLE_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';
import {
	type EnrolledRafflesQuery,
	type ListEnrolledRafflesResponse,
	listEnrolledRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Cached inner implementation. Receives `userId` and `token` explicitly so
 * they form part of the cache key — preventing cross-user cache sharing.
 * `getSession()` is intentionally NOT called here; the outer action resolves
 * the session and passes it in, as required for `'use cache'` scopes where
 * `cookies()` / `headers()` are forbidden.
 *
 * Tagged with `CACHE_TAGS.MY_RAFFLES` so `revalidateMyRaffles()` clears this
 * entry alongside host raffles when the user's enrollment state changes.
 */
async function getEnrolledRafflesCached(
	userId: string,
	token: string,
	query: EnrolledRafflesQuery | undefined,
): Promise<ServiceResponse<ListEnrolledRafflesResponse, RaffleErrorCode>> {
	'use cache';

	// Base tag: `revalidateMyRaffles()` uses this to clear all users' entries.
	// User-scoped tag: enables future per-user invalidation and satisfies
	// the cache-key requirement — userId must appear in the function body.
	cacheTag(CACHE_TAGS.MY_RAFFLES, `${CACHE_TAGS.MY_RAFFLES}-${userId}`);

	try {
		const response = await baseClient.get('/me/enrolled-raffles', {
			params: buildQueryParamsWithStatus(query),
			headers: { Authorization: `Bearer ${token}` },
		});
		const validated = listEnrolledRafflesResponseSchema.parse(response.data);

		cacheLife({ stale: 30, revalidate: 60, expire: 120 });

		return success(validated);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-enrolled-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}

/**
 * Fetches raffles the user has enrolled in (participant mode).
 *
 * Resolves the session, then delegates to a `'use cache'` inner function keyed
 * on `(userId, token, query)` so the Next data cache deduplicates per-user
 * and per-query-shape. The `MY_RAFFLES` cache tag wires this to
 * `revalidateMyRaffles()` — mutations clear stale entries after enrollment changes.
 *
 * @param query - Optional query parameters for filtering enrolled raffles
 * @returns ServiceResponse with enrolled raffle list on success, RaffleErrorCode on failure
 */
export async function getEnrolledRaffles(
	query?: EnrolledRafflesQuery,
): Promise<ServiceResponse<ListEnrolledRafflesResponse, RaffleErrorCode>> {
	const session = await getSession();
	if (!session) {
		return failure(COMMON_ERROR_CODES.UNAUTHORIZED);
	}
	return getEnrolledRafflesCached(session.user.id, session.token, query);
}
