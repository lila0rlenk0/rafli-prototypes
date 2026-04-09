'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapHostError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { HOST_ERROR_CODES, type HostErrorCode } from '@/types/errors';
import { type HostProfile, hostProfileSchema } from '@/types/host';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches a host's public profile by username or user ID.
 *
 * The backend resolves both username and UUID internally.
 *
 * @param usernameOrId - The host's username or user ID (UUID)
 * @returns ServiceResponse with host profile on success, HostErrorCode on failure
 */
export async function getHostProfile(
	usernameOrId: string,
): Promise<ServiceResponse<HostProfile, HostErrorCode>> {
	try {
		const response = await baseClient.get(`/users/${usernameOrId}`);
		return success(hostProfileSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'host', 'get-host-profile');
			return failure(HOST_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapHostError(error));
	}
}
