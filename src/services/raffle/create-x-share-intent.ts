'use server';

import { ZodError, z } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapRaffleError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type XShareIntentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

const xShareIntentResponseSchema = z.object({
	claimId: z.string().min(1),
	expiresAt: z.string(),
	shareUrl: z.url(),
	token: z.string().min(1),
});

type XShareIntentResponse = z.infer<typeof xShareIntentResponseSchema>;

/**
 * Creates an X share intent for the given raffle.
 * Backend generates a tokenized share URL that must be used in the tweet
 * so the verify endpoint can later find the tweet via X API search.
 *
 * @param raffleId - The UUID of the raffle to share
 * @returns Tokenized share URL + claim metadata, or error code
 */
export async function createXShareIntent(
	raffleId: string,
): Promise<ServiceResponse<XShareIntentResponse, XShareIntentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/x-share-intent`,
		);

		return success(xShareIntentResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'create-x-share-intent');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		captureServiceError(error, errorCode, {
			service: 'raffle',
			action: 'create-x-share-intent',
		});
		return failure(errorCode);
	}
}
