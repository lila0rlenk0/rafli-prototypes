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
 * Lax-review wire contract. Backend returns a discriminated union:
 *
 *  - `verified` — terminal grant. X search returned `found`/`unavailable`, OR the user
 *    exhausted the lax-retry budget and was granted blind. UNIQUE(raffleId, userId)
 *    caps the prize at one bonus ticket per user per raffle (lifetime).
 *  - `pending_review` — non-terminal. X's recent-search index didn't carry the tweet
 *    yet (~30–120s lag); the user is asked to retry after `retryAfterSeconds`. After
 *    `attemptsRemaining` hits zero, the next call grants blind so honest users hit
 *    by index lag are never permanently locked out.
 *
 * Wire definition is the source of truth in `src/core/x-shares/dto/x-share.dto.ts` on
 * the backend; keep this schema in lockstep with `VerifyXShareResponseDto`.
 */
const verifiedResponseSchema = z.object({
	claimId: z.string(),
	status: z.literal('verified'),
	// Verified always means a ledger grant happened. Reject impossible values
	// before we refresh RSC into a verified UI state with no usable ticket change.
	ticketsGranted: z.number().int().positive(),
});

const pendingReviewResponseSchema = z.object({
	// Lax-retry budget remaining. Frontend uses this to render "X attempts left"
	// copy and to know that the next call will fall back to a blind grant when 0.
	attemptsRemaining: z.number().int().nonnegative(),
	claimId: z.string(),
	// Server-enforced cooldown anchor — the next verify call inside this window
	// rejects with `core:xshare:cooldown`, so the UI honors the same delay.
	retryAfterSeconds: z.number().int().positive(),
	status: z.literal('pending_review'),
});

const verifyXShareResponseSchema = z.discriminatedUnion('status', [
	verifiedResponseSchema,
	pendingReviewResponseSchema,
]);

type VerifyXShareResponse = z.infer<typeof verifyXShareResponseSchema>;

/**
 * Verifies the user's X share claim under the backend's lax-review policy.
 *
 * Returns either a terminal `verified` grant or a deferred `pending_review` outcome.
 * UNIQUE(raffleId, userId) on the backend caps the prize at one ticket per user per
 * raffle (lifetime); the only legitimately strict gate is that uniqueness, so this
 * client never converts a deferred response into a failure toast.
 *
 * @param raffleId - The UUID of the raffle being verified
 * @returns Lax-review result (verified or pending_review), or a typed error code
 */
export async function verifyXShare(
	raffleId: string,
): Promise<ServiceResponse<VerifyXShareResponse, XShareVerifyErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/verify-x-share`,
		);

		const parsed = verifyXShareResponseSchema.parse(response.data);

		// Only the verified branch mutates ticket totals — pending_review leaves the
		// claim row alone, so the cache invalidation is a wasted RSC re-render.
		if (parsed.status === 'verified') {
			runAfter(() => {
				revalidateRaffleDetail(raffleId);
			});
		}

		return success(parsed);
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
