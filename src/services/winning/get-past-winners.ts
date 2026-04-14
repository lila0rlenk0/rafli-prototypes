'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapWinningError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type ListPastWinnersResponse,
	listPastWinnersResponseSchema,
	type PastWinnersQuery,
} from '@/types/winning';

/**
 * Fetches the paginated public past winners archive.
 *
 * Public endpoint — uses `baseClient` (S2S secret only, no Bearer JWT).
 * Backend masks `winnerDisplayName` to "First L." and strips userId before
 * responding, same privacy posture as /winnings/recent.
 *
 * Unlike `/recent` this endpoint is UNCACHED on the backend (per
 * winnings.public.api.ts — `limit × page` key space would bloat Redis for
 * cold archive traffic). Rate-limiting is the operative control.
 *
 * @param query - Pagination params. `limit` caps at 50, default 20. `page` starts at 1.
 * @returns ServiceResponse with paginated winners on success, WinningErrorCode on failure.
 */
export async function getPastWinners(
	query?: PastWinnersQuery,
): Promise<ServiceResponse<ListPastWinnersResponse, WinningErrorCode>> {
	try {
		const response = await baseClient.get('/winnings/past', {
			params: buildQueryParams(query),
		});
		return success(listPastWinnersResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'winning', 'get-past-winners');
			return failure(WINNING_ERROR_CODES.FETCH_FAILED);
		}

		// Report to Sentry before returning — the page renders the archive from
		// a prerendered snapshot, so a silent mapping here (as before) would bake
		// the error UI into the PPR cache with zero visibility. `captureServiceError`
		// internally drops codes listed in `EXPECTED_ERROR_CODES`, so legitimate
		// user-path failures (e.g. rate limits) still don't burn quota.
		const errorCode = mapWinningError(error);
		captureServiceError(error, errorCode, {
			service: 'winning',
			action: 'get-past-winners',
		});
		return failure(errorCode);
	}
}
