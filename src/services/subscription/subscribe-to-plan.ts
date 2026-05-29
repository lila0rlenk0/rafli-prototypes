'use server';

import { ZodError } from 'zod';

import { env } from '@/env/server';
import { SUBSCRIPTION_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
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
	type CreateSubscriptionResponse,
	createSubscriptionResponseSchema,
	type SubscribeToPlanPayload,
	subscribeToPlanPayloadSchema,
	SUBSCRIPTION_PROVIDER,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Initiates a hosted-checkout subscription flow for the given plan + provider.
 *
 * Endpoint: `POST /subscriptions` (auth required). Returns a hosted checkout
 * URL — Stripe Checkout for `provider: 'stripe'`, Fanbasis hosted-redirect for
 * `provider: 'fanbasis'` — and the resolved provider so the caller can attach
 * provider-aware analytics and post-redirect copy without parsing the URL.
 *
 * The action does NOT perform the redirect itself so the client component can
 * react to failures (toast on error, loading state, etc.) before the
 * full-page navigation.
 *
 * Success / cancel URLs are constructed server-side from `APP_URL` instead of
 * accepting them from the caller. Open-redirect abuse via attacker-controlled
 * query strings is a known risk on subscription flows; pinning the origin
 * here removes that surface entirely.
 *
 * `cancelUrl` is sent only on the Stripe path: Stripe Checkout requires a
 * cancel target for the abandoned-checkout button, while Fanbasis's hosted
 * page has no cancel hook (the buyer aborts by closing the tab) and its
 * dispatcher silently ignores the field. The backend rejects a Stripe request
 * missing `cancelUrl` with `payments:subscription:checkout-failed`, which is
 * already in the subscription error mapper.
 *
 * @param payload - `{ planId, provider }` — validated locally before the network hop.
 * @returns ServiceResponse with `{ checkoutUrl, provider }` on success.
 */
export async function subscribeToPlan(
	payload: SubscribeToPlanPayload,
): Promise<ServiceResponse<CreateSubscriptionResponse, SubscriptionErrorCode>> {
	// Resolve the session once up-front so analytics can attribute the event
	// to the right user regardless of which branch we exit from. Wrapped in
	// Promise.resolve because `getSession` is already async — kept for
	// symmetry with the rest of the payment actions that capture analytics via
	// `trackAfter`.
	const sessionPromise = getSession();

	try {
		// Step 1: Validate payload shape locally — cheap, avoids a round-trip
		// with obviously-malformed input (e.g. a non-UUID from a stale cached
		// page, or a tampered provider string).
		const validation = subscribeToPlanPayloadSchema.safeParse(payload);
		if (!validation.success) {
			return failure(SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND);
		}

		// Step 2: Build canonical success/cancel URLs under our own origin.
		// Using `new URL` ensures the path is joined safely; we never splice in
		// user-controlled fragments here. `pricing?status=...` lets the page
		// render a toast after the provider returns without a query-string leak.
		const successUrl = new URL(
			'/pricing?status=success',
			env.APP_URL,
		).toString();
		const cancelUrl = new URL('/pricing?status=cancel', env.APP_URL).toString();

		// Step 3: Hit the backend. Backend validates ownership, current
		// subscription status, the provider lock, and creates the hosted
		// checkout session. Cancel URL is only sent on the Stripe path —
		// Fanbasis ignores it and the dispatcher would reject Stripe-without-
		// cancelUrl with `checkout-failed`.
		const isStripe = validation.data.provider === SUBSCRIPTION_PROVIDER.STRIPE;
		const response = await authenticatedClient.post(
			'/subscriptions',
			{
				provider: validation.data.provider,
				planId: validation.data.planId,
				successUrl,
				...(isStripe ? { cancelUrl } : {}),
			},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 4: Validate response shape — `checkoutUrl` (we redirect to it)
		// and `provider` (drives downstream branching) are both load-bearing,
		// so a drift lands in the catch below as a ZodError.
		const data = createSubscriptionResponseSchema.parse(response.data);

		// Step 5: Analytics after successful session creation — fire-and-forget
		// via trackAfter so it never blocks the redirect. Attribution to
		// authenticated user only; anonymous callers don't reach this branch
		// because the backend already rejected them at Step 3. `provider` is
		// included on the event so the funnel splits Stripe vs Fanbasis without
		// a re-hydration step on the analytics side.
		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.CHECKOUT_REDIRECTED,
			{
				plan_id: validation.data.planId,
				provider: data.provider,
			},
			{ userId },
		);

		return success(data);
	} catch (error) {
		// Step 6: Contract drift — fingerprinted separately in Sentry so a
		// real deploy regression shows up as one issue, not N Zod failures.
		if (error instanceof ZodError) {
			captureContractDrift(error, 'subscription', 'subscribe-to-plan');
			return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		// Step 7: Map through the subscription domain mapper. Captured for
		// Sentry under a deterministic fingerprint so a spike in, say,
		// `already-subscribed` stands out against the usual noise. Expected
		// codes (plan-not-found, already-subscribed, provider-locked, etc.)
		// are dropped by `shouldCaptureServiceError` via the filter's
		// EXPECTED_ERROR_CODES set.
		const errorCode = mapSubscriptionError(error);
		captureServiceError(error, errorCode, {
			service: 'subscription',
			action: 'subscribe-to-plan',
		});

		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.FAILED,
			{
				plan_id: payload.planId,
				provider: payload.provider,
				error_code: errorCode,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
