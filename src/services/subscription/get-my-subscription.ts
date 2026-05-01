'use server';

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
	type MySubscription,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches the authenticated user's current subscription from the backend.
 *
 * Endpoint: `GET /me/subscription` (auth required). The backend always
 * returns 200 with `{ subscription: null }` for users who never subscribed
 * or whose subscription has fully expired, so the no-subscription state
 * is a successful response with a null payload rather than a 404. Every
 * failure path (401, 500, network, contract drift) returns `failure(...)`
 * and is captured for observability.
 *
 * @returns ServiceResponse wrapping the subscription (or null) on success.
 */
export async function getMySubscription(): Promise<
	ServiceResponse<MySubscription | null, SubscriptionErrorCode>
> {
	try {
		// Step 1: Hit the backend. `QUERY` timeout is tuned for cold-start
		// latency on a serverless read path.
		const response = await authenticatedClient.get('/me/subscription', {
			timeout: API_TIMEOUTS.QUERY,
		});

		// Step 2: Parse the wire envelope, then unwrap. The wrapper shape is
		// `{ subscription: T | null }` — keeping the parse on the envelope
		// (rather than partially on `response.data.subscription`) means a
		// renamed wrapper key surfaces as contract drift instead of silently
		// reading `undefined`.
		const parsed = mySubscriptionResponseSchema.parse(response.data);
		return success(parsed.subscription);
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
}
