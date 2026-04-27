'use server';

import { ZodError } from 'zod';

import { authenticatedClient, baseClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { type Raffle, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Chooses the authenticated client only after the session is backend-validated.
 * A raw cookie token can be stale or revoked; using it directly would turn a
 * public raffle page into a 401 for users with bad cookies. `getSession()`
 * degrades invalid/transient auth to `null`, keeping the public page readable
 * while still enriching `xShareClaim` for valid authenticated callers.
 */
async function getRaffleClient() {
	try {
		const { getSession } = await import('@/lib/auth/session');
		const session = await getSession();
		return session ? authenticatedClient : baseClient;
	} catch {
		// Outside a request scope (tests/build) there is no cookie store; public
		// raffle data is still the correct fallback in that environment.
		return baseClient;
	}
}

/**
 * Fetches a single raffle by public slug
 *
 * @param publicSlug - The public slug of the raffle to fetch
 * @returns ServiceResponse with raffle on success, RaffleErrorCode on failure
 */
export async function getRaffle(
	publicSlug: string,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	try {
		const client = await getRaffleClient();
		const response = await client.get(`/raffles/${pathParam(publicSlug)}`);
		return success(raffleSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
