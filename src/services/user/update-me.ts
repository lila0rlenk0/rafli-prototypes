'use server';

import { runAfter } from '@/lib/run-after';
import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
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
 * Service response type for updating current user data
 */
type UpdateMeServiceResponse = ServiceResponse<
	UpdateMeResponse,
	RaffleErrorCode
>;

/**
 * Updates the current authenticated user's profile data
 *
 * @param payload - Partial update payload with only changed fields
 * @returns ServiceResponse with updated user data on success, RaffleErrorCode on failure
 */
export async function updateMe(
	payload: UpdateMePayload,
): Promise<UpdateMeServiceResponse> {
	try {
		// Validate payload before sending
		const validationResult = updateMePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		// Only send if there are actual changes
		if (Object.keys(validationResult.data).length === 0) {
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const response = await authenticatedClient.put(
			'/me',
			validationResult.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Validate response structure
		const validatedData = updateMeResponseSchema.parse(response.data);

		runAfter(async () => {
			await revalidateProfile();
		});

		return success(validatedData);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			captureContractDrift(error, 'user', 'update-me');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
