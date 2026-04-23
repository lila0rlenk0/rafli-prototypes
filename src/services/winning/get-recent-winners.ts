'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
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
 * Public endpoint — uses `baseClient` (S2S secret only, no Bearer JWT).
 * Backend masks `winnerDisplayName` to "First L." and strips userId before
 * responding, so this surface is safe to render to anonymous visitors.
 *
 * Backend caches the response in Redis for 5 minutes keyed by `limit`,
 * so calling this on every browse request is essentially free.
 *
 * @param query - Optional limit override (1-20). Omit to use backend default (6).
 * @returns ServiceResponse with winners array on success, WinningErrorCode on failure
 */
export async function getRecentWinners(
	query?: RecentWinnersQuery,
): Promise<ServiceResponse<ListRecentWinnersResponse, WinningErrorCode>> {
	try {
		const response = await baseClient.get('/winnings/recent', {
			params: buildQueryParams(query),
		});
		return success(listRecentWinnersResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'winning', 'get-recent-winners');
			return failure(WINNING_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapWinningError(error));
	}
}
