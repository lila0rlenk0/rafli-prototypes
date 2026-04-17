'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
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
 * `baseClient` rather than `authenticatedClient` so unauthenticated visitors
 * can see the /pricing page without a sign-in round-trip.
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
	try {
		// Step 1: Fetch plans from the public backend endpoint.
		const response = await baseClient.get('/subscriptions/plans');

		// Step 2: Parse through the Zod contract — throws into the catch on drift.
		return success(subscriptionPlansResponseSchema.parse(response.data));
	} catch (error) {
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
