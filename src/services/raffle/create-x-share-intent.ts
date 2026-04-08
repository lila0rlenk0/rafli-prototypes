'use server';

import { ZodError, z } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

// =============================================================================
// RESPONSE SCHEMA
// =============================================================================

const xShareIntentResponseSchema = z.object({
	claimId: z.string(),
	expiresAt: z.string(),
	shareUrl: z.string(),
	token: z.string(),
});

type XShareIntentResponse = z.infer<typeof xShareIntentResponseSchema>;

type CreateXShareIntentResponse = ServiceResponse<
	XShareIntentResponse,
	RaffleErrorCode
>;

// =============================================================================
// SERVER ACTION
// =============================================================================

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
): Promise<CreateXShareIntentResponse> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/x-share-intent`,
		);

		const validated = xShareIntentResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('X share intent response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		captureServiceError(error, errorCode, {
			service: 'raffle',
			action: 'createXShareIntent',
		});
		return failure(errorCode);
	}
}
