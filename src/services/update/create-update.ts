'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, mapUpdateError, success } from '@/lib/errors';
import { UPDATE_ERROR_CODES, type UpdateErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	updateSchema,
	type CreateUpdatePayload,
	type Update,
} from '@/types/update';

/**
 * Response type for creating an update
 */
type CreateUpdateServiceResponse = ServiceResponse<Update, UpdateErrorCode>;

/**
 * Creates a new update for a raffle
 *
 * @param raffleId - The ID of the raffle
 * @param payload - The update content (text and optional imageUrls)
 * @returns ServiceResponse with created update on success, UpdateErrorCode on failure
 */
export async function createUpdate(
	raffleId: string,
	payload: CreateUpdatePayload,
): Promise<CreateUpdateServiceResponse> {
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/updates`,
			payload,
		);
		const validated = updateSchema.parse(response.data);

		// Fire-and-forget — update posting is not revenue-critical
		void trackServer(
			RAFFLE_EVENTS.UPDATE_POSTED,
			{ raffle_id: raffleId },
			{ userId },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Create update response validation failed:', error);
			return failure(UPDATE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapUpdateError(error));
	}
}
