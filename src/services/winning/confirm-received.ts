'use server';

import { runAfter } from '@/lib/run-after';
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
import { type Winning, winningSchema } from '@/types/winning';

/**
 * Confirms that the winner has received the prize.
 *
 * Can be called when winning status is 'sent' or 'delivered'.
 * Transitions status to 'received' and enables reviews.
 *
 * @param winningId - The UUID of the winning entry
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function confirmReceived(
	winningId: string,
	publicSlug?: string,
): Promise<ServiceResponse<Winning, WinningErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Confirm receipt — transitions sent/delivered → received, enables reviews
		const response = await authenticatedClient.post(
			`/winnings/${winningId}/confirm-received`,
		);

		// Step 2: Validate response shape
		const validated = winningSchema.parse(response.data);

		// Step 3: Non-blocking cache revalidation + analytics
		runAfter(async () => {
			// Revalidation target: winning detail and list pages
			revalidateWinningPaths(publicSlug);

			const userId = (await sessionPromise)?.user?.id;
			await trackServer(
				WINNING_EVENTS.CONFIRMED_RECEIVED,
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
			captureContractDrift(error, 'winning', 'confirm-received');
			return failure(WINNING_ERROR_CODES.CONFIRM_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
