'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { revalidateWinningPaths } from '@/lib/cache/revalidation';
import { failure, mapWinningError, success } from '@/lib/errors';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type ClaimWinningPayload,
	type Winning,
	winningSchema,
} from '@/types/winning';

/**
 * Response type for claiming a winning
 */
type ClaimWinningServiceResponse = ServiceResponse<Winning, WinningErrorCode>;

/**
 * Claims a winning prize by submitting shipping information
 *
 * Called by the winner to provide their shipping address.
 * Transitions status from awaiting_host (no shipping) to awaiting_host (with shipping).
 *
 * @param raffleId - The UUID of the raffle
 * @param payload - The claim data including shipping info
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function claimWinning(
	raffleId: string,
	payload: ClaimWinningPayload,
	publicSlug?: string,
): Promise<ClaimWinningServiceResponse> {
	try {
		const response = await authenticatedClient.post(
			`/winnings/${raffleId}/claim`,
			payload,
		);

		const validated = winningSchema.parse(response.data);
		revalidateWinningPaths(publicSlug);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Claim winning response validation failed:', error);
			return failure(WINNING_ERROR_CODES.CLAIM_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
