'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapWinningError, success } from '@/lib/errors';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type HostRaffleWinningsResponse,
	hostRaffleWinningsResponseSchema,
} from '@/types/winning';

/**
 * Response type for fetching raffle winnings (host-only)
 */
type GetRaffleWinningsResponse = ServiceResponse<
	HostRaffleWinningsResponse,
	WinningErrorCode
>;

/**
 * Fetches all winnings for a raffle (host-only endpoint)
 *
 * @param raffleId - The raffle ID to fetch winnings for
 * @returns ServiceResponse with winnings list on success, WinningErrorCode on failure
 */
export async function getRaffleWinnings(
	raffleId: string,
): Promise<GetRaffleWinningsResponse> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${raffleId}/winnings`,
		);

		const validated = hostRaffleWinningsResponseSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Raffle winnings response validation failed:', error);
			return failure(WINNING_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
