'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { cachedBaseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/query-params';
import { failure, mapWinningError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type ListRecentWinnersResponse,
	listRecentWinnersResponseSchema,
	type RecentWinnersQuery,
} from '@/types/winning';

/**
 * Fetches the public "Most recent winners!" feed.
 *
 * Public endpoint — uses `cachedBaseClient` (S2S secret only, no Bearer JWT
 * and no `headers()` read, since cached scopes can't access per-request data).
 * Backend masks `winnerDisplayName` to "First L." and strips userId before
 * responding, so this surface is safe to render to anonymous visitors.
 *
 * Cached at the Next layer too: backend already caches 5min in Redis, but
 * `'use cache'` skips the fetch entirely for repeat renders inside the SWR
 * window — saves the network round-trip, not just the DB query.
 *
 * @param query - Optional limit override (1-20). Omit to use backend default (6).
 * @returns ServiceResponse with winners array on success, WinningErrorCode on failure
 */
export async function getRecentWinners(
	query?: RecentWinnersQuery,
): Promise<ServiceResponse<ListRecentWinnersResponse, WinningErrorCode>> {
	'use cache';

	try {
		const response = await cachedBaseClient.get('/winnings/recent', {
			params: buildQueryParams(query),
		});
		const validated = listRecentWinnersResponseSchema.parse(response.data);

		// stale 60s, revalidate at 5min, hard expire at 10min — aligns with
		// the backend Redis TTL so we don't serve data older than the source.
		cacheLife({ stale: 60, revalidate: 300, expire: 600 });

		return success(validated);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		if (error instanceof ZodError) {
			captureContractDrift(error, 'winning', 'get-recent-winners');
			return failure(WINNING_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapWinningError(error));
	}
}
