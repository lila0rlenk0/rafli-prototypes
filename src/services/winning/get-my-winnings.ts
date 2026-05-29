'use server';

import { authenticatedClient } from '@/lib/api/client';
import { callService } from '@/lib/api/call-service';
import { mapWinningError } from '@/lib/errors';
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
	return callService({
		client: authenticatedClient,
		method: 'get',
		url: '/me/winnings',
		schema: listWinningsResponseSchema,
		domain: 'winning',
		action: 'get-my-winnings',
		driftCode: WINNING_ERROR_CODES.FETCH_FAILED,
		mapError: mapWinningError,
	});
}
