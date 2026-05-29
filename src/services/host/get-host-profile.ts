'use server';

import { cache } from 'react';

import { baseClient } from '@/lib/api/client';
import { callService } from '@/lib/api/call-service';
import { pathParam } from '@/lib/utils/routing/path-param';
import { mapHostError } from '@/lib/errors';
import { HOST_ERROR_CODES, type HostErrorCode } from '@/types/errors';
import { type HostProfile, hostProfileSchema } from '@/types/host';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Request-deduped impl of the host profile fetch. Wrapped in `React.cache`
 * so `generateMetadata` and the page component share a single round-trip
 * per request (mirrors `getMySubscription` / `getSession`).
 *
 * NOT a server action — `React.cache` wraps plain async functions only.
 */
const getHostProfileCached = cache(async function getHostProfileImpl(
	usernameOrId: string,
): Promise<ServiceResponse<HostProfile, HostErrorCode>> {
	return callService({
		client: baseClient,
		method: 'get',
		url: `/users/${pathParam(usernameOrId)}`,
		schema: hostProfileSchema,
		domain: 'host',
		action: 'get-host-profile',
		driftCode: HOST_ERROR_CODES.FETCH_FAILED,
		mapError: mapHostError,
	});
});

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
	return getHostProfileCached(usernameOrId);
}
