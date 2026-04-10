'use server';

import { WINNING_EVENTS } from '@/lib/analytics/events';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { type Winning } from '@/types/winning';

import { updateWinningStatusBase } from './update-winning-status-base';

/**
 * Marks a winning prize as delivered by the host.
 *
 * Thin wrapper over `updateWinningStatusBase` — resolves the mark-delivered
 * endpoint and telemetry metadata, then delegates the shared POST → parse
 * → revalidate → track pipeline. Starts the 48-hour auto-confirm countdown
 * and transitions status from `sent` to `delivered`.
 *
 * @param winningId - The UUID of the winning entry
 * @param publicSlug - Optional raffle slug for public page revalidation
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function markDelivered(
	winningId: string,
	publicSlug?: string,
): Promise<ServiceResponse<Winning, WinningErrorCode>> {
	return updateWinningStatusBase({
		endpoint: `/winnings/${winningId}/mark-delivered`,
		action: 'mark-delivered',
		event: WINNING_EVENTS.MARKED_DELIVERED,
		zodErrorCode: WINNING_ERROR_CODES.MARK_DELIVERED_FAILED,
		publicSlug,
	});
}
