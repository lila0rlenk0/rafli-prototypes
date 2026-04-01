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
import { type Winning, winningSchema } from '@/types/winning';

/**
 * Response type for marking a winning as delivered
 */
type MarkDeliveredServiceResponse = ServiceResponse<Winning, WinningErrorCode>;

/**
 * Marks a winning prize as delivered by the host
 *
 * Called by the raffle host to indicate the prize has been delivered.
 * Starts the 48-hour auto-confirm countdown.
 * Transitions status from sent to delivered.
 *
 * @param winningId - The UUID of the winning entry
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function markDelivered(
	winningId: string,
	publicSlug?: string,
): Promise<MarkDeliveredServiceResponse> {
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			`/winnings/${winningId}/mark-delivered`,
		);

		const validated = winningSchema.parse(response.data);
		revalidateWinningPaths(publicSlug);

		// Fire-and-forget — fulfillment tracking must not block UX
		void trackServer(
			WINNING_EVENTS.MARKED_DELIVERED,
			{
				winning_id: validated.id,
				raffle_id: validated.raffleId,
			},
			{ userId },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Mark delivered response validation failed:', error);
			return failure(WINNING_ERROR_CODES.MARK_DELIVERED_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
