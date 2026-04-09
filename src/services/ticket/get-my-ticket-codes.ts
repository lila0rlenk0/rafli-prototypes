'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapTicketError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { TICKET_ERROR_CODES, type TicketErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type TicketCodesQuery,
	type TicketCodesResponse,
	ticketCodesResponseSchema,
} from '@/types/ticket';

/**
 * Fetches the current user's ticket codes with pagination and raffle filtering.
 *
 * @param query - Query parameters for pagination and raffle filtering
 * @returns ServiceResponse with paginated ticket codes on success, TicketErrorCode on failure
 */
export async function getMyTicketCodes(
	query?: TicketCodesQuery,
): Promise<ServiceResponse<TicketCodesResponse, TicketErrorCode>> {
	try {
		const response = await authenticatedClient.get('/me/ticket-codes', {
			params: buildQueryParams(query),
		});
		return success(ticketCodesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'ticket', 'get-my-ticket-codes');
			return failure(TICKET_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapTicketError(error));
	}
}
