'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
import { failure, mapUpdateError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { UPDATE_ERROR_CODES, type UpdateErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	updateSchema,
	type CreateUpdatePayload,
	type Update,
} from '@/types/update';

/**
 * Creates a new update for a raffle.
 *
 * @param raffleId - The ID of the raffle
 * @param payload - The update content (text and optional imageUrls)
 * @returns ServiceResponse with created update on success, UpdateErrorCode on failure
 */
export async function createUpdate(
	raffleId: string,
	payload: CreateUpdatePayload,
): Promise<ServiceResponse<Update, UpdateErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Submit update to backend
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/updates`,
			payload,
		);

		// Step 2: Validate response shape
		const data = updateSchema.parse(response.data);

		// Step 3: Must `await` trackAfter — it resolves IP via headers() in
		// request scope then defers the Mixpanel round-trip via after().
		// `void trackAfter(...)` would run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			RAFFLE_EVENTS.UPDATE_POSTED,
			{
				raffle_id: raffleId,
				update_id: data.id,
				body_length: payload.text.length,
			},
			{ userId: session?.user?.id },
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'update', 'create-update');
			return failure(UPDATE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapUpdateError(error));
	}
}
