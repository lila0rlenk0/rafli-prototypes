'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching user's raffles list
 */
type GetMyRafflesResponse = ServiceResponse<
	ListRafflesResponse,
	RaffleErrorCode
>;

/**
 * Builds URLSearchParams with support for repeated keys (e.g., status=draft&status=queued)
 *
 * TODO: Remove this workaround after BE supports comma-separated status filter.
 * Once BE is fixed, replace with: `params: buildQueryParams(query)`
 *
 * @param query - Query parameters for filtering raffles
 * @returns URLSearchParams with repeated status keys if comma-separated
 */
function buildRaffleQueryParams(query?: MyRafflesQuery): URLSearchParams {
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
 * Fetches the current user's raffles with optional filtering
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns ServiceResponse with raffle list on success, RaffleErrorCode on failure
 */
export async function getMyRaffles(
	query?: MyRafflesQuery,
): Promise<GetMyRafflesResponse> {
	try {
		// TODO: After BE supports comma-separated status, replace with:
		// const params = buildQueryParams(query);
		const params = buildRaffleQueryParams(query);

		const response = await authenticatedClient.get('/me/raffles', {
			params,
		});

		// Validate response data structure
		const validatedData = listRafflesResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('My raffles response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
