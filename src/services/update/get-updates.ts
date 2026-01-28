'use server';

import { baseClient } from '@/lib/api/client';
import { failure, mapUpdateError, success } from '@/lib/errors';
import { UPDATE_ERROR_CODES, type UpdateErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	listUpdatesResponseSchema,
	type ListUpdatesResponse,
} from '@/types/update';
import { ZodError } from 'zod';

/**
 * Response type for getting updates
 */
type GetUpdatesServiceResponse = ServiceResponse<
	ListUpdatesResponse,
	UpdateErrorCode
>;

/**
 * Fetches updates for a raffle
 *
 * @param raffleId - The ID of the raffle
 * @returns ServiceResponse with updates list on success, UpdateErrorCode on failure
 */
export async function getUpdates(
	raffleId: string,
): Promise<GetUpdatesServiceResponse> {
	try {
		const response = await baseClient.get(`/raffles/${raffleId}/updates`);
		const validated = listUpdatesResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Updates response validation failed:', error);
			return failure(UPDATE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapUpdateError(error));
	}
}
