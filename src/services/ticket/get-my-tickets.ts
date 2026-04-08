'use server';

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
import { ZodError } from 'zod';

/**
 * Response type for fetching user's ticket balances
 */
type GetMyTicketsResponse = ServiceResponse<TicketsResponse, TicketErrorCode>;

/**
 * Fetches the current user's ticket balances with optional raffle filtering
 *
 * @param query - Optional query parameters for filtering by raffle
 * @returns ServiceResponse with ticket balances on success, TicketErrorCode on failure
 */
export async function getMyTickets(
	query?: TicketsQuery,
): Promise<GetMyTicketsResponse> {
	try {
		const params = buildQueryParams(query);

		const response = await authenticatedClient.get('/me/tickets', {
			params,
		});

		const validatedData = ticketsResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'ticket', 'get-my-tickets');
			return failure(TICKET_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapTicketError(error);
		return failure(errorCode);
	}
}
