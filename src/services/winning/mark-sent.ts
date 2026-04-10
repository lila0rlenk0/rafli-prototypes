'use server';

import { WINNING_EVENTS } from '@/lib/analytics/events';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { type MarkSentPayload, type Winning } from '@/types/winning';

import { updateWinningStatusBase } from './update-winning-status-base';

/**
 * Marks a winning prize as sent by the host.
 *
 * Thin wrapper over `updateWinningStatusBase` — resolves the mark-sent
 * endpoint and telemetry metadata, then delegates the shared POST → parse
 * → revalidate → track pipeline. Requires a proof URL (tracking link or
 * shipping receipt). Transitions status from `awaiting_host` to `sent`.
 *
 * @param winningId - The UUID of the winning entry
 * @param payload - The mark sent data including proofUrl and optional hostNotes
 * @param publicSlug - Optional raffle slug for public page revalidation
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function markSent(
	winningId: string,
	payload: MarkSentPayload,
	publicSlug?: string,
): Promise<ServiceResponse<Winning, WinningErrorCode>> {
	return updateWinningStatusBase({
		endpoint: `/winnings/${winningId}/mark-sent`,
		payload,
		action: 'mark-sent',
		event: WINNING_EVENTS.MARKED_SENT,
		zodErrorCode: WINNING_ERROR_CODES.MARK_SENT_FAILED,
		publicSlug,
	});
}
