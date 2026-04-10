'use server';

import { WINNING_EVENTS } from '@/lib/analytics/events';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { type Winning } from '@/types/winning';

import { updateWinningStatusBase } from './update-winning-status-base';

/**
 * Confirms that the winner has received the prize.
 *
 * Thin wrapper over `updateWinningStatusBase` — resolves the confirm-received
 * endpoint and telemetry metadata, then delegates the shared POST → parse
 * → revalidate → track pipeline. Can be called when winning status is
 * `sent` or `delivered`. Transitions status to `received` and enables
 * reviews.
 *
 * @param winningId - The UUID of the winning entry
 * @param publicSlug - Optional raffle slug for public page revalidation
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function confirmReceived(
	winningId: string,
	publicSlug?: string,
): Promise<ServiceResponse<Winning, WinningErrorCode>> {
	return updateWinningStatusBase({
		endpoint: `/winnings/${winningId}/confirm-received`,
		action: 'confirm-received',
		event: WINNING_EVENTS.CONFIRMED_RECEIVED,
		zodErrorCode: WINNING_ERROR_CODES.CONFIRM_FAILED,
		publicSlug,
	});
}
