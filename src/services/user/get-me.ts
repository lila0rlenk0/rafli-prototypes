'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { meResponseSchema, type MeResponse } from '@/types/user';

/**
 * Fetches the current authenticated user's profile data.
 *
 * `avatarUrl` is extracted from `image` (plain string URL from backend).
 *
 * @returns ServiceResponse with user data on success, RaffleErrorCode on failure
 */
export async function getMe(): Promise<
	ServiceResponse<MeResponse & { avatarUrl: string | null }, RaffleErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/me');
		const data = meResponseSchema.parse(response.data);

		// Image is now a plain string URL from the backend
		return success({ ...data, avatarUrl: data.image ?? null });
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'user', 'get-me');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
