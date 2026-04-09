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
import {
	type MarkSentPayload,
	type Winning,
	winningSchema,
} from '@/types/winning';

/**
 * Marks a winning prize as sent by the host.
 *
 * Requires a proof URL (tracking link or shipping receipt).
 * Transitions status from awaiting_host to sent.
 *
 * @param winningId - The UUID of the winning entry
 * @param payload - The mark sent data including proofUrl and optional hostNotes
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function markSent(
	winningId: string,
	payload: MarkSentPayload,
	publicSlug?: string,
): Promise<ServiceResponse<Winning, WinningErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Mark sent with proof URL — transitions awaiting_host → sent
		const response = await authenticatedClient.post(
			`/winnings/${winningId}/mark-sent`,
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
				WINNING_EVENTS.MARKED_SENT,
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
			captureContractDrift(error, 'winning', 'mark-sent');
			return failure(WINNING_ERROR_CODES.MARK_SENT_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
