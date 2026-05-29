'use server';

import { cacheLife } from 'next/cache';
import { ZodError } from 'zod';

import { cachedBaseClient } from '@/lib/api/client';
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
	type SubscriptionPlansResponse,
	subscriptionPlansResponseSchema,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches the catalogue of active subscription plans from the backend.
 *
 * Endpoint: `GET /subscriptions/plans` (public, no auth required). We use
 * `cachedBaseClient` rather than `authenticatedClient` so unauthenticated
 * visitors can see the /pricing page without a sign-in round-trip.
 *
 * Cached aggressively — plans are near-static (admin-configured, rarely
 * edited) and rendered on every /pricing load. Avoiding the round-trip on
 * every request is a cheap win for a public, high-traffic page.
 *
 * Validation: response shape is parsed through the subscription Zod contract —
 * any drift (missing metadata field, unknown status, etc.) is routed to Sentry
 * as a `contract_drift` issue and surfaced to the caller as `FETCH_FAILED` so
 * the page renders a recoverable error rather than crashing the route.
 *
 * @returns ServiceResponse wrapping the validated plans list on success,
 *          or a SubscriptionErrorCode on any failure path.
 */
export async function getPlans(): Promise<
	ServiceResponse<SubscriptionPlansResponse, SubscriptionErrorCode>
> {
	'use cache';

	try {
		// Step 1: Fetch plans from the public backend endpoint.
		const response = await cachedBaseClient.get('/subscriptions/plans');

		// Step 2: Parse through the Zod contract — throws into the catch on drift.
		const validated = subscriptionPlansResponseSchema.parse(response.data);

		// Plans are near-static admin data — longer windows are safe.
		cacheLife({ stale: 300, revalidate: 1_800, expire: 7_200 });

		return success(validated);
	} catch (error) {
		// Failures cache briefly so a recovered backend isn't masked by a
		// stale error for the full success window.
		cacheLife({ stale: 0, revalidate: 5, expire: 30 });

		// Step 3: Contract drift — backend response shape changed.
		// Route to Sentry under the `contract_drift` fingerprint so a single
		// deploy regression collapses into one issue instead of N parse failures.
		if (error instanceof ZodError) {
			captureContractDrift(error, 'subscription', 'get-plans');
			return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		// Step 4: Network/HTTP error — map through the subscription domain mapper
		// (accepts `payments:subscription:*` and `global:*`). Captured to Sentry
		// for observability — this is a read-only pricing endpoint so any
		// non-expected failure here is worth investigating.
		const errorCode = mapSubscriptionError(error);
		captureServiceError(error, errorCode, {
			service: 'subscription',
			action: 'get-plans',
		});

		return failure(errorCode);
	}
}
