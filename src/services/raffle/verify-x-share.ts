'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError, z } from 'zod';

import { authenticatedClient, createRequest } from '@/lib/api/client';
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
 * `verifyOutcome` discriminates the three verified paths so the UI can render honest
 * copy: `found` was provably verified, `unavailable` was granted because X's API
 * was down, `not_found_exhausted` was granted blind on the retry-budget fallback
 * (today the majority — X's t.co rewriter strips `?xref=<token>` so entity validation
 * rejects every legitimate tweet). It is OMITTED on the idempotent already-verified
 * republish path, since the persisted outcome belongs to the CAS winner — not this
 * caller's local lookup.
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
	// Optional — see file-level docstring; idempotent replays omit it.
	verifyOutcome: z
		.enum(['found', 'not_found_exhausted', 'unavailable'])
		.optional(),
});

const pendingReviewResponseSchema = z.object({
	// Lax-retry budget remaining. Frontend uses this to render "X attempts left"
	// copy and to know that the next call will fall back to a blind grant when 0.
	attemptsRemaining: z.number().int().nonnegative(),
	claimId: z.string(),
	// Single value today: we can't tell "no tweet" from "X index lag" on a deferred
	// outcome. Optional and forward-compatible so a future widening doesn't break parse.
	pendingReason: z.literal('tweet_not_visible').optional(),
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
		// Tighter-than-default 12s timeout — this endpoint fans out to X's
		// recent-search API on the backend, the slowest external dependency in
		// the verify path. The default 20s axios cap leaves only 10s of headroom
		// under Vercel's 30s edge limit; on cold starts that headroom evaporates
		// and the page returns an unhandled 504 instead of a typed failure.
		// Capping at 12s surfaces transient hangs as `timeout_error` (mapped from
		// ECONNABORTED by the base error mapper) so the UI can render a
		// "try again" CTA well before the edge cap fires.
		const client = createRequest(authenticatedClient, 12_000);
		const response = await client.post(
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
