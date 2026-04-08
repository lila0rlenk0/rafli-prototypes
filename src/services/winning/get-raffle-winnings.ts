'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapWinningError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type HostRaffleWinningsResponse,
	type WinningStatus,
	hostRaffleWinningsResponseSchema,
} from '@/types/winning';

/** Optional query params matching backend GetRaffleWinnersQueryDto */
interface GetRaffleWinningsParams {
	page?: number;
	limit?: number;
	status?: WinningStatus;
}

/**
 * Response type for fetching raffle winnings (host-only)
 */
type GetRaffleWinningsResponse = ServiceResponse<
	HostRaffleWinningsResponse,
	WinningErrorCode
>;

/**
 * Fetches winnings for a raffle (host-only endpoint)
 * Supports pagination and status filtering via backend query params
 *
 * @param raffleId - The raffle ID to fetch winnings for
 * @param params - Optional pagination/filter params (page, limit, status)
 * @returns ServiceResponse with winnings list on success, WinningErrorCode on failure
 */
export async function getRaffleWinnings(
	raffleId: string,
	params?: GetRaffleWinningsParams,
): Promise<GetRaffleWinningsResponse> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${raffleId}/winners`,
			{ params },
		);

		const validated = hostRaffleWinningsResponseSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'winning', 'get-raffle-winnings');
			return failure(WINNING_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
