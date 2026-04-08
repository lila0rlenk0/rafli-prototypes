'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { meResponseSchema, type MeResponse } from '@/types/user';
import { ZodError } from 'zod';

/**
 * Response type for fetching current user data
 * Includes avatarUrl which is extracted from the image object
 */
type GetMeResponse = ServiceResponse<
	MeResponse & { avatarUrl: string | null },
	RaffleErrorCode
>;

/**
 * Fetches the current authenticated user's profile data
 *
 * @returns ServiceResponse with user data on success, RaffleErrorCode on failure
 */
export async function getMe(): Promise<GetMeResponse> {
	try {
		const response = await authenticatedClient.get('/me');

		const validatedData = meResponseSchema.parse(response.data);

		// Image is now a plain string URL from the backend
		const avatarUrl = validatedData.image ?? null;

		return success({
			...validatedData,
			avatarUrl,
		});
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'user', 'get-me');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
