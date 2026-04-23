'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { buildQueryParamsWithStatus } from '@/lib/api/query-params';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { HostRafflesQuery } from '@/types/host';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches raffles for a specific host.
 *
 * Either hostId or username must be provided.
 * Status can be comma-separated for multiple statuses (e.g., "ended,fulfilling,completed,cancelled").
 *
 * @param query - Query parameters including hostId/username, status, and pagination
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getHostRaffles(
	query: HostRafflesQuery,
): Promise<ServiceResponse<ListRafflesResponse, RaffleErrorCode>> {
	try {
		const response = await baseClient.get('/raffles', {
			params: buildQueryParamsWithStatus(query),
		});
		return success(listRafflesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'host', 'get-host-raffles');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
