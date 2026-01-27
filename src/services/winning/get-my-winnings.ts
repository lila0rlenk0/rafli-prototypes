'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapWinningError, success } from '@/lib/errors';
import { WINNING_ERROR_CODES, type WinningErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type ListWinningsResponse,
	listWinningsResponseSchema,
} from '@/types/winning';
import { ZodError } from 'zod';

/**
 * Response type for fetching user's winnings
 */
type GetMyWinningsResponse = ServiceResponse<
	ListWinningsResponse,
	WinningErrorCode
>;

/**
 * Fetches the current user's winnings
 *
 * @returns ServiceResponse with paginated winnings on success, WinningErrorCode on failure
 */
export async function getMyWinnings(): Promise<GetMyWinningsResponse> {
	try {
		const response = await authenticatedClient.get('/me/winnings');

		const validatedData = listWinningsResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('My winnings response validation failed:', error);
			return failure(WINNING_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapWinningError(error);
		return failure(errorCode);
	}
}
