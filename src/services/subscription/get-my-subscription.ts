'use server';

import { AxiosError } from 'axios';
import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
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
	mySubscriptionSchema,
	type MySubscription,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches the authenticated user's current subscription from the backend.
 *
 * Endpoint: `GET /subscriptions/me` (auth required). The backend returns 404
 * with `payments:subscription:not-found` for users who never subscribed or
 * whose subscription has fully expired — we fold that into `success(null)`
 * rather than bubbling as a failure so callers branch on `data === null`
 * instead of matching a specific error code. Every other failure path
 * (401, 500, network, contract drift) stays a `failure(...)` and is captured
 * for observability.
 *
 * @returns ServiceResponse wrapping the subscription (or null) on success.
 */
export async function getMySubscription(): Promise<
	ServiceResponse<MySubscription | null, SubscriptionErrorCode>
> {
	try {
		// Step 1: Hit the backend. `QUERY` timeout is tuned for cold-start
		// latency on a serverless read path.
		const response = await authenticatedClient.get('/subscriptions/me', {
			timeout: API_TIMEOUTS.QUERY,
		});

		// Step 2: Parse through the embedded-plan contract. A drift here
		// lands in the catch below as ZodError and surfaces as FETCH_FAILED.
		return success(mySubscriptionSchema.parse(response.data));
	} catch (error) {
		// Step 3: Contract drift — response shape changed. Fingerprinted as
		// a single Sentry issue per deploy regression (see captureContractDrift).
		if (error instanceof ZodError) {
			captureContractDrift(error, 'subscription', 'get-my-subscription');
			return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		// Step 4: 404 → no subscription. Short-circuit BEFORE the domain
		// mapper so we never capture this as a service error — every guest
		// pageview on /pricing would otherwise fire a "not found" capture
		// and bury real issues. Checked against the HTTP status directly
		// because the RFC 7807 extraction is deterministic only for the
		// canonical `payments:subscription:not-found` shape — a backend
		// returning a bare 404 body without a `type` field would still be
		// the same "no subscription" state and should behave identically.
		if (error instanceof AxiosError && error.response?.status === 404) {
			return success(null);
		}

		// Step 5: Every other failure — map through the subscription mapper
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
