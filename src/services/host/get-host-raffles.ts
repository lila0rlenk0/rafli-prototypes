'use server';

import { baseClient } from '@/lib/api/client';
import { callService } from '@/lib/api/call-service';
import { buildQueryParamsWithStatus } from '@/lib/api/query-params';
import { mapRaffleError } from '@/lib/errors';
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
	return callService({
		client: baseClient,
		method: 'get',
		url: '/raffles',
		schema: listRafflesResponseSchema,
		domain: 'host',
		action: 'get-host-raffles',
		driftCode: RAFFLE_ERROR_CODES.FETCH_FAILED,
		mapError: mapRaffleError,
		config: { params: buildQueryParamsWithStatus(query) },
	});
}
