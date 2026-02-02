'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapWinningError, success } from '@/lib/errors';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { type Winning, winningSchema } from '@/types/winning';

/**
 * Response type for confirming prize received
 */
type ConfirmReceivedServiceResponse = ServiceResponse<Winning, WinningErrorCode>;

/**
 * Confirms that the winner has received the prize
 *
 * Can be called when winning status is 'sent' or 'delivered'.
 * Transitions status to 'received' and enables reviews.
 *
 * @param winningId - The UUID of the winning entry
 * @returns ServiceResponse with updated winning on success, WinningErrorCode on failure
 */
export async function confirmReceived(
	winningId: string,
): Promise<ConfirmReceivedServiceResponse> {
	try {
		const response = await authenticatedClient.post(
			`/winnings/${winningId}/confirm-received`,
		);

		const validated = winningSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Confirm received response validation failed:', error);
			return failure(WINNING_ERROR_CODES.CONFIRM_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
