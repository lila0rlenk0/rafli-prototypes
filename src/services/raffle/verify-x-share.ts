'use server';

import { runAfter } from '@/lib/run-after';
import { ZodError, z } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { revalidateRaffleDetail } from '@/lib/cache/revalidation';
import { failure, mapRaffleError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

const verifyXShareResponseSchema = z.object({
	claimId: z.string(),
	reason: z.enum(['not_found']).nullable(),
	status: z.enum(['not_found', 'verified']),
	ticketsGranted: z.number(),
});

type VerifyXShareResponse = z.infer<typeof verifyXShareResponseSchema>;

/**
 * Verifies that the user posted the tokenized share URL on X.
 * Backend searches X API v2 for a tweet containing the token, then
 * atomically grants one free ticket if found.
 *
 * @param raffleId - The UUID of the raffle being verified
 * @returns Verification result with ticket count, or error code
 */
export async function verifyXShare(
	raffleId: string,
): Promise<ServiceResponse<VerifyXShareResponse, RaffleErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/verify-x-share`,
		);

		const verified = verifyXShareResponseSchema.parse(response.data);

		// Revalidate raffle cache so server components reflect updated ticket count
		// and claim status without a full page reload
		if (verified.status === 'verified') {
			runAfter(() => {
				revalidateRaffleDetail(raffleId);
			});
		}

		return success(verified);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'verify-x-share');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		captureServiceError(error, errorCode, {
			service: 'raffle',
			action: 'verify-x-share',
		});
		return failure(errorCode);
	}
}
