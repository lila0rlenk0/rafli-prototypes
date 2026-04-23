'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	updateMePayloadSchema,
	updateMeResponseSchema,
	type UpdateMePayload,
	type UpdateMeResponse,
} from '@/types/user';
import { revalidateProfile } from './revalidate-profile';

/**
 * Updates the current authenticated user's profile data.
 *
 * Only sends changed fields (partial update). Returns early if payload
 * is invalid or empty — prevents pointless network round trips.
 *
 * @param payload - Partial update payload with only changed fields
 * @returns ServiceResponse with updated user data on success, RaffleErrorCode on failure
 */
export async function updateMe(
	payload: UpdateMePayload,
): Promise<ServiceResponse<UpdateMeResponse, RaffleErrorCode>> {
	try {
		// Step 1: Validate payload — reject malformed updates before network call
		const validationResult = updateMePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		// Step 2: Guard — no-op if caller passed an empty diff
		if (Object.keys(validationResult.data).length === 0) {
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		// Step 3: Send partial update to backend
		const response = await authenticatedClient.put(
			'/me',
			validationResult.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 4: Validate response shape
		const data = updateMeResponseSchema.parse(response.data);

		// Step 5: Revalidate /profile path so profile page reflects updated data
		// Revalidation target: /profile path
		runAfter(async () => {
			await revalidateProfile();
		});

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'user', 'update-me');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
