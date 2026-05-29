'use server';

import { cache } from 'react';
import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { failure, mapSubscriptionError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import {
	SUBSCRIPTION_ERROR_CODES,
	type SubscriptionErrorCode,
} from '@/types/errors';
import {
	mySubscriptionResponseSchema,
	type MySubscriptionResponse,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Request-deduped implementation of the subscription fetch.
 *
 * Wrapped in `React.cache` so multiple RSCs in the same profile render tree
 * (e.g. `CreditsSection` and `SubscriptionSection`) share a single backend
 * round-trip rather than issuing two independent `/me/subscription` calls.
 * Mirrors the `getSession` / `getCurrentUser` pattern in `@/lib/auth/session`.
 *
 * NOT a server action — `React.cache` wraps plain async functions only.
 * The exported `getMySubscription` server action delegates here.
 */
const getMySubscriptionCached = cache(
	async function getMySubscriptionImpl(): Promise<
		ServiceResponse<MySubscriptionResponse, SubscriptionErrorCode>
	> {
		try {
			// Step 1: Hit the backend. `QUERY` timeout is tuned for cold-start
			// latency on a serverless read path.
			const response = await authenticatedClient.get('/me/subscription', {
				timeout: API_TIMEOUTS.QUERY,
			});

			// Step 2: Parse the wire envelope and forward it as-is. The wrapper
			// shape is `{ subscription, capabilities, lockedProvider }`; we keep
			// the parse on the envelope (rather than partially on the embedded
			// entity) so a renamed wrapper key surfaces as contract drift instead
			// of silently reading `undefined`. We deliberately do NOT unwrap to
			// `parsed.subscription` — see the JSDoc for why capabilities and
			// lockedProvider need to reach consumers alongside the entity.
			const parsed = mySubscriptionResponseSchema.parse(response.data);
			return success(parsed);
		} catch (error) {
			// Step 3: Contract drift — response shape changed. Fingerprinted as
			// a single Sentry issue per deploy regression (see captureContractDrift).
			if (error instanceof ZodError) {
				captureContractDrift(error, 'subscription', 'get-my-subscription');
				return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
			}

			// Step 4: Every other failure — map through the subscription mapper
			// and capture for Sentry. Expected codes (e.g. unauthenticated) are
			// dropped by EXPECTED_ERROR_CODES in the Sentry filter.
			const errorCode = mapSubscriptionError(error);
			captureServiceError(error, errorCode, {
				service: 'subscription',
				action: 'get-my-subscription',
			});
			return failure(errorCode);
		}
	},
);

/**
 * Fetches the authenticated user's current subscription envelope from the backend.
 *
 * Endpoint: `GET /me/subscription` (auth required). The backend always
 * returns 200 with `{ subscription, capabilities, lockedProvider }` even for
 * users who never subscribed or whose subscription has fully expired (in
 * which case `subscription` and `capabilities` are both null). The
 * no-subscription state is therefore signalled by `data.subscription === null`
 * inside the wrapper, never by a 404 or a `null` ServiceResponse payload.
 *
 * Why we return the full wrapper instead of unwrapping to `MySubscription | null`:
 * `capabilities` is the FE's source of truth for management-UI gating
 * (`hasSelfServePortal`, `canCancel`, `canChangePlan`, `canUpdatePaymentMethod`)
 * and `lockedProvider` pins the re-subscribe checkout to whichever provider
 * the user originally bought through. Both live alongside the subscription
 * entity rather than inside it because they exist even when the subscription
 * is null (e.g. a churned user who can still see their original provider
 * surface up-stream for re-subscription). Unwrapping to just the entity was
 * a holdover from when the response was a bare `MySubscription | null` — it
 * silently dropped the gate signals and forced every consumer to default to
 * the legacy Stripe path. Threading the wrapper end-to-end lets components
 * branch on `capabilities?.hasSelfServePortal ?? true` and reach the Fanbasis
 * cancel-dialog branch when the backend says so.
 *
 * Every failure path (401, 500, network, contract drift) returns
 * `failure(...)` and is captured for observability.
 *
 * @returns ServiceResponse wrapping the full envelope on success — read
 *   `data.subscription` for the entity, `data.capabilities` for the gate
 *   matrix, and `data.lockedProvider` for the re-subscribe provider lock.
 */
export async function getMySubscription(): Promise<
	ServiceResponse<MySubscriptionResponse, SubscriptionErrorCode>
> {
	return getMySubscriptionCached();
}
