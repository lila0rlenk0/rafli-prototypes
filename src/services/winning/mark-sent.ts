'use server';

import { ZodError } from 'zod';

import { WINNING_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { revalidateWinningPaths } from '@/lib/cache/revalidation';
import { failure, mapWinningError, success } from '@/lib/errors';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type MarkSentPayload,
	type Winning,
	winningSchema,
} from '@/types/winning';

/**
 * Response type for marking a winning as sent
 */
type MarkSentServiceResponse = ServiceResponse<Winning, WinningErrorCode>;

/**
 * Marks a winning prize as sent by the host
 *
 * Called by the raffle host to indicate the prize has been shipped.
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
): Promise<MarkSentServiceResponse> {
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			`/winnings/${winningId}/mark-sent`,
			payload,
		);

		const validated = winningSchema.parse(response.data);
		revalidateWinningPaths(publicSlug);

		// Fire-and-forget — fulfillment tracking must not block UX
		void trackServer(
			WINNING_EVENTS.MARKED_SENT,
			{
				winning_id: validated.id,
				raffle_id: validated.raffleId,
			},
			{ userId },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Mark sent response validation failed:', error);
			return failure(WINNING_ERROR_CODES.MARK_SENT_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
