'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapTicketError, success } from '@/lib/errors';
import { TICKET_ERROR_CODES, type TicketErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	type TicketCodesQuery,
	type TicketCodesResponse,
	ticketCodesResponseSchema,
} from '@/types/ticket';
import { ZodError } from 'zod';

/**
 * Response type for fetching user's ticket codes
 */
type GetMyTicketCodesResponse = ServiceResponse<
	TicketCodesResponse,
	TicketErrorCode
>;

/**
 * Fetches the current user's ticket codes with pagination and raffle filtering
 *
 * @param query - Query parameters for pagination and raffle filtering
 * @returns ServiceResponse with paginated ticket codes on success, TicketErrorCode on failure
 */
export async function getMyTicketCodes(
	query?: TicketCodesQuery,
): Promise<GetMyTicketCodesResponse> {
	try {
		const params = buildQueryParams(query);

		const response = await authenticatedClient.get('/me/ticket-codes', {
			params,
		});

		const validatedData = ticketCodesResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('My ticket codes response validation failed:', error);
			return failure(TICKET_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapTicketError(error);
		return failure(errorCode);
	}
}
