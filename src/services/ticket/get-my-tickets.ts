'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapTicketError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { TICKET_ERROR_CODES, type TicketErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type TicketsQuery,
	type TicketsResponse,
	ticketsResponseSchema,
} from '@/types/ticket';

/**
 * Fetches the current user's ticket balances with optional raffle filtering.
 *
 * @param query - Optional query parameters for filtering by raffle
 * @returns ServiceResponse with ticket balances on success, TicketErrorCode on failure
 */
export async function getMyTickets(
	query?: TicketsQuery,
): Promise<ServiceResponse<TicketsResponse, TicketErrorCode>> {
	try {
		const response = await authenticatedClient.get('/me/tickets', {
			params: buildQueryParams(query),
		});
		return success(ticketsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'ticket', 'get-my-tickets');
			return failure(TICKET_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapTicketError(error));
	}
}
