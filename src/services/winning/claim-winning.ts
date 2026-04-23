'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError } from 'zod';

import { WINNING_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
import { revalidateWinningPaths } from '@/lib/cache/revalidation';
import { failure, mapWinningError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type ClaimWinningPayload,
	type Winning,
	winningSchema,
} from '@/types/winning';

/**
 * Claims a winning prize by submitting shipping information.
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
): Promise<ServiceResponse<Winning, WinningErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Submit claim with shipping info — transitions pending → awaiting_host
		const response = await authenticatedClient.post(
			`/winnings/${pathParam(raffleId)}/claim`,
			payload,
		);

		// Step 2: Validate response shape
		const validated = winningSchema.parse(response.data);

		// Step 3: Non-blocking cache revalidation + analytics
		runAfter(async () => {
			// Revalidation target: winning detail and list pages
			revalidateWinningPaths(publicSlug);

			const userId = (await sessionPromise)?.user?.id;
			await trackServer(
				WINNING_EVENTS.CLAIMED,
				{
					winning_id: validated.id,
					raffle_id: validated.raffleId,
				},
				{ userId },
			);
		});

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'winning', 'claim-winning');
			return failure(WINNING_ERROR_CODES.CLAIM_FAILED);
		}

		// Step 4: Map and capture — prize-fulfillment failures must reach Sentry
		// with the same criticality as auth/payment (winner cannot claim prize)
		const errorCode = mapWinningError(error);
		captureServiceError(error, errorCode, {
			service: 'winning',
			action: 'claim-winning',
		});
		return failure(errorCode);
	}
}
