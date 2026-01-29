'use server';

import { authenticatedClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type EnrolledRafflesQuery,
	type ListEnrolledRafflesResponse,
	listEnrolledRafflesResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching user's enrolled raffles list
 */
type GetEnrolledRafflesResponse = ServiceResponse<
	ListEnrolledRafflesResponse,
	RaffleErrorCode
>;

/**
 * Builds URLSearchParams with support for repeated keys (e.g., status=live&status=ended)
 *
 * TODO: Remove this workaround after BE supports comma-separated status filter.
 * Once BE is fixed, replace with: `params: buildQueryParams(query)`
 *
 * @param query - Query parameters for filtering enrolled raffles
 * @returns URLSearchParams with repeated status keys if comma-separated
 */
function buildEnrolledRafflesQueryParams(
	query?: EnrolledRafflesQuery,
): URLSearchParams {
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
 * Fetches raffles the user has enrolled in (participant mode)
 *
 * @param query - Optional query parameters for filtering enrolled raffles
 * @returns ServiceResponse with enrolled raffle list on success, RaffleErrorCode on failure
 */
export async function getEnrolledRaffles(
	query?: EnrolledRafflesQuery,
): Promise<GetEnrolledRafflesResponse> {
	try {
		// TODO: After BE supports comma-separated status, replace with:
		// const params = buildQueryParams(query);
		const params = buildEnrolledRafflesQueryParams(query);

		const response = await authenticatedClient.get('/me/enrolled-raffles', {
			params,
		});

		// Validate response data structure
		const validatedData = listEnrolledRafflesResponseSchema.parse(
			response.data,
		);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('Enrolled raffles response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
