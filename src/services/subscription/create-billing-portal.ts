'use server';

import { ZodError } from 'zod';

import { env } from '@/env/server';
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
	type CreateBillingPortalResponse,
	createBillingPortalResponseSchema,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Creates a Stripe Customer Portal session so the authenticated user can
 * self-serve cancel, plan switch, payment-method updates, and invoice
 * history.
 *
 * Endpoint: `POST /me/billing-portal-sessions` (auth required). Stripe-only by
 * design: Fanbasis users have no Stripe customer record so the call returns
 * `payments:subscription:no-customer`. The FE branches off
 * `capabilities.hasSelfServePortal` (false on Fanbasis) and renders an in-app
 * cancel surface for those users instead of calling this action.
 *
 * `returnUrl` is constructed server-side from `APP_URL` rather than accepted
 * from the caller — same open-redirect rationale as `subscribe-to-plan`. The
 * backend additionally allowlists the origin via `normalizeCheckoutRedirectUrl`,
 * but we never want the FE to be the surface that lets a phishing path slip
 * past the allowlist.
 *
 * `/pricing` is the return target rather than `/profile`: when the user
 * finishes cancelling or downgrading, the pricing grid re-fetches their
 * subscription and renders the updated current-plan state without a stale
 * read on the dashboard.
 *
 * No Mixpanel tracking here — `subscribe-to-plan` tracks because it sits on
 * the conversion funnel that drives revenue dashboards. Portal opens are an
 * auxiliary self-serve action, audited via the backend's structured logs
 * (`payment:billing-portal:attempt|success|skipped`); duplicating them on the
 * FE would skew the subscription funnel without adding new signal.
 *
 * @returns ServiceResponse with `{ url }` on success — caller redirects.
 */
export async function createBillingPortal(): Promise<
	ServiceResponse<CreateBillingPortalResponse, SubscriptionErrorCode>
> {
	try {
		// Step 1: Build the canonical return URL under our own origin. `new URL`
		// joins safely; we never splice in user-controlled fragments here.
		const returnUrl = new URL('/pricing', env.APP_URL).toString();

		// Step 2: Hit the backend. It looks up the most-recent Stripe customer
		// for the authenticated user, mints a billingPortal.sessions, and
		// returns its short-lived URL. 404 `no-customer` when the user never
		// subscribed via Stripe (or Stripe deleted the customer record) — this
		// also covers Fanbasis users by design.
		const response = await authenticatedClient.post(
			'/me/billing-portal-sessions',
			{ returnUrl },
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate the wire shape. Drift here lands in the catch as
		// a ZodError — we redirect to `data.url`, so a renamed field would
		// otherwise navigate to `undefined`.
		const data = createBillingPortalResponseSchema.parse(response.data);

		return success(data);
	} catch (error) {
		// Step 4: Contract drift fingerprinted separately so a deploy
		// regression shows up as one Sentry issue, not N Zod failures.
		if (error instanceof ZodError) {
			captureContractDrift(error, 'subscription', 'create-billing-portal');
			return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		// Step 5: Map through the subscription mapper. `payments:subscription:*`
		// codes (including `no-customer`) pass through unchanged; transport /
		// HTTP-status fallbacks collapse to CommonErrorCode. Expected codes
		// (no-customer, unauthenticated, ratelimit) are dropped by
		// `shouldCaptureServiceError` via EXPECTED_ERROR_CODES.
		const errorCode = mapSubscriptionError(error);
		captureServiceError(error, errorCode, {
			service: 'subscription',
			action: 'create-billing-portal',
		});
		return failure(errorCode);
	}
}
