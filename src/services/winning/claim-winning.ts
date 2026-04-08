'use server';

import { ZodError } from 'zod';

import { WINNING_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { revalidateWinningPaths } from '@/lib/cache/revalidation';
import { failure, mapWinningError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
 * Transitions status from 'pending' to 'awaiting_host'.
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
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			`/winnings/${raffleId}/claim`,
			payload,
		);

		const validated = winningSchema.parse(response.data);
		revalidateWinningPaths(publicSlug);

		// Track winning claimed (awaited — important for fulfillment funnel)
		await trackServer(
			WINNING_EVENTS.CLAIMED,
			{
				winning_id: validated.id,
				raffle_id: validated.raffleId,
			},
			{ userId },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'winning', 'claim-winning');
			return failure(WINNING_ERROR_CODES.CLAIM_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
