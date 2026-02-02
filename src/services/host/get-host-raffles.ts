'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { HostRafflesQuery } from '@/types/host';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching host raffles
 */
type GetHostRafflesResponse = ServiceResponse<ListRafflesResponse, RaffleErrorCode>;

/**
 * Builds URLSearchParams with support for repeated keys (e.g., status=ended&status=fulfilling)
 *
 * TODO: Remove this workaround after BE supports comma-separated status filter.
 * Once BE is fixed, replace with: `params: buildQueryParams(query)`
 *
 * @param query - Query parameters for filtering raffles
 * @returns URLSearchParams with repeated status keys if comma-separated
 */
function buildHostRaffleQueryParams(query?: HostRafflesQuery): URLSearchParams {
	const searchParams = new URLSearchParams();

	if (!query) return searchParams;

	const { status, ...rest } = query;

	// Handle status: split comma-separated values into repeated params
	if (status) {
		const statuses = status.split(',');
		for (const s of statuses) {
			searchParams.append('status', s.trim());
		}
	}

	// Add remaining params normally
	const otherParams = buildQueryParams(rest);
	for (const [key, value] of Object.entries(otherParams)) {
		searchParams.append(key, value);
	}

	return searchParams;
}

/**
 * Fetches raffles for a specific host
 *
 * Either hostId or username must be provided.
 * Status can be comma-separated for multiple statuses (e.g., "ended,fulfilling,completed,cancelled").
 *
 * @param query - Query parameters including hostId/username, status, and pagination
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getHostRaffles(
	query: HostRafflesQuery,
): Promise<GetHostRafflesResponse> {
	try {
		// TODO: After BE supports comma-separated status, replace with:
		// const params = buildQueryParams(query);
		const params = buildHostRaffleQueryParams(query);

		const response = await baseClient.get('/raffles', {
			params,
		});

		// Validate response data structure
		const validatedData = listRafflesResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('Host raffles response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
