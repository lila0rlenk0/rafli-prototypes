'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapWinningError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type ListWinningsResponse,
	listWinningsResponseSchema,
} from '@/types/winning';

/**
 * Fetches the current user's winnings.
 *
 * @returns ServiceResponse with paginated winnings on success, WinningErrorCode on failure
 */
export async function getMyWinnings(): Promise<
	ServiceResponse<ListWinningsResponse, WinningErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/me/winnings');
		return success(listWinningsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'winning', 'get-my-winnings');
			return failure(WINNING_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
