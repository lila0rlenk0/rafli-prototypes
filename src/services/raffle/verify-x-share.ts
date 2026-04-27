'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError, z } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { revalidateRaffleDetail } from '@/lib/cache/revalidation';
import { failure, mapRaffleError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type XShareVerifyErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Backend collapsed verify into a single grant-on-success path. The previous
 * `not_found` outcome is gone — the X search is best-effort, and the ticket
 * is granted regardless of whether the tweet was indexed. Failure surfaces as
 * an HTTP error code (`core:xshare:expired`, `core:xshare:not-found`, ...).
 */
const verifyXShareResponseSchema = z.object({
	claimId: z.string(),
	status: z.literal('verified'),
	// Success means a ledger grant happened. Reject impossible values before
	// we refresh RSC into a verified UI state with no usable ticket change.
	ticketsGranted: z.number().int().positive(),
});

type VerifyXShareResponse = z.infer<typeof verifyXShareResponseSchema>;

/**
 * Verifies the user's X share claim and grants a free ticket.
 *
 * Backend behaviour: a single best-effort X search runs server-side; the
 * ticket is granted on the success path regardless of search outcome.
 * UNIQUE(raffleId, userId) caps abuse at one ticket per user per raffle
 * (lifetime), so the previous client-side retry loop is no longer needed.
 *
 * @param raffleId - The UUID of the raffle being verified
 * @returns Verification result with ticket count, or error code
 */
export async function verifyXShare(
	raffleId: string,
): Promise<ServiceResponse<VerifyXShareResponse, XShareVerifyErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/verify-x-share`,
		);

		const verified = verifyXShareResponseSchema.parse(response.data);

		// Verified always means tickets changed — flush the raffle cache so
		// server components re-render with the updated ticket count and the
		// claim status flips from `pending` to `verified` on next paint.
		runAfter(() => {
			revalidateRaffleDetail(raffleId);
		});

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
