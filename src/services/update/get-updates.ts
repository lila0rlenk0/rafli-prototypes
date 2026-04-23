'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapUpdateError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { UPDATE_ERROR_CODES, type UpdateErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	listUpdatesResponseSchema,
	type ListUpdatesResponse,
} from '@/types/update';

/** Optional pagination parameters for fetching updates */
interface GetUpdatesParams {
	limit?: number;
	offset?: number;
}

/**
 * Fetches updates for a raffle.
 *
 * @param raffleId - The ID of the raffle
 * @param params - Optional pagination parameters (limit, offset)
 * @returns ServiceResponse with updates list on success, UpdateErrorCode on failure
 */
export async function getUpdates(
	raffleId: string,
	params?: GetUpdatesParams,
): Promise<ServiceResponse<ListUpdatesResponse, UpdateErrorCode>> {
	try {
		const response = await baseClient.get(
			`/raffles/${pathParam(raffleId)}/updates`,
			{
				params,
			},
		);
		return success(listUpdatesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'update', 'get-updates');
			return failure(UPDATE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapUpdateError(error));
	}
}
