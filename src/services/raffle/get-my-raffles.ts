'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { ZodError } from 'zod';

import { cachedBaseClient } from '@/lib/api/client';
import { CACHE_TAGS } from '@/lib/api/constants';
import { buildQueryParamsWithStatus } from '@/lib/api/query-params';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import {
	COMMON_ERROR_CODES,
	RAFFLE_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
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
 * entry when the user creates, edits, or deletes a raffle.
 */
async function getMyRafflesCached(
	userId: string,
	token: string,
	query: MyRafflesQuery | undefined,
): Promise<ServiceResponse<ListRafflesResponse, RaffleErrorCode>> {
	'use cache';

	// Base tag: `revalidateMyRaffles()` uses this to clear all users' entries.
	// User-scoped tag: enables future per-user invalidation and satisfies
	// the cache-key requirement — userId must appear in the function body.
	cacheTag(CACHE_TAGS.MY_RAFFLES, `${CACHE_TAGS.MY_RAFFLES}-${userId}`);

	try {
		const response = await cachedBaseClient.get('/me/raffles', {
			params: buildQueryParamsWithStatus(query),
			headers: { Authorization: `Bearer ${token}` },
		});
		const validated = listRafflesResponseSchema.parse(response.data);

		cacheLife({ stale: 30, revalidate: 60, expire: 120 });

		return success(validated);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-my-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		// Non-Zod failures (timeout, 5xx, network) returned dark until now —
		// capture so the real backend cause surfaces. Expected codes
		// (unauthorized/forbidden) are dropped by `shouldCaptureServiceError`;
		// timeout/network sampled 10% via `beforeSend`.
		const errorCode = mapRaffleError(error);
		captureServiceError(error, errorCode, {
			service: 'raffle',
			action: 'get-my-raffles',
		});
		return failure(errorCode);
	}
}

/**
 * Fetches the current user's raffles with optional filtering.
 *
 * Resolves the session, then delegates to a `'use cache'` inner function keyed
 * on `(userId, token, query)` so the Next data cache deduplications per-user
 * and per-query-shape. The `MY_RAFFLES` cache tag wires this to
 * `revalidateMyRaffles()` — mutations call that helper to clear stale entries.
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getMyRaffles(
	query?: MyRafflesQuery,
): Promise<ServiceResponse<ListRafflesResponse, RaffleErrorCode>> {
	const session = await getSession();
	if (!session) {
		return failure(COMMON_ERROR_CODES.UNAUTHORIZED);
	}
	return getMyRafflesCached(session.user.id, session.token, query);
}
