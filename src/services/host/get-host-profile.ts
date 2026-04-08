'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { failure, mapHostError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { HOST_ERROR_CODES, type HostErrorCode } from '@/types/errors';
import { type HostProfile, hostProfileSchema } from '@/types/host';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for fetching host profile
 */
type GetHostProfileResponse = ServiceResponse<HostProfile, HostErrorCode>;

/**
 * Fetches a host's public profile by username or user ID
 *
 * The backend resolves both username and UUID internally.
 *
 * @param usernameOrId - The host's username or user ID (UUID)
 * @returns ServiceResponse with host profile on success, HostErrorCode on failure
 */
export async function getHostProfile(
	usernameOrId: string,
): Promise<GetHostProfileResponse> {
	try {
		const response = await baseClient.get(`/users/${usernameOrId}`);

		// Validate response data structure
		const validatedData = hostProfileSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			captureContractDrift(error, 'host', 'get-host-profile');
			return failure(HOST_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapHostError(error);
		return failure(errorCode);
	}
}
