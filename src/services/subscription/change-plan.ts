'use server';

import { ZodError } from 'zod';

import { env } from '@/env/server';
import { SUBSCRIPTION_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { revalidateMySubscription } from '@/lib/cache/revalidation';
import { failure, mapSubscriptionError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import {
	COMMON_ERROR_CODES,
	SUBSCRIPTION_ERROR_CODES,
	type SubscriptionErrorCode,
} from '@/types/errors';
import {
	type ChangePlanPayload,
	changePlanPayloadSchema,
	type UpsertChangePlanResponseDto,
	upsertChangePlanResponseSchema,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Changes the authenticated user's subscription to a different plan.
 *
 * Endpoint: `PATCH /subscriptions/:id` (auth required). The backend auto-
 * detects the provider from the existing subscription row — the FE NEVER
 * sends a provider field. The response is a flat discriminated union over
 * three outcomes:
 *
 * - `'in-place'`  — Stripe immediate swap; benefits flip now.
 * - `'scheduled'` — Stripe scheduled-at-period-end downgrade.
 * - `'redirect'`  — Fanbasis cancel-and-recreate; caller must redirect to
 *                   the returned `checkoutUrl` to complete the new subscription.
 *
 * The action does NOT perform the Fanbasis redirect itself so the client
 * component can render loading / error states before the full-page nav.
 * Success / cancel URLs are constructed server-side from `APP_URL` (same
 * open-redirect rationale as `subscribeToPlan`).
 *
 * @param payload - `{ subscriptionId, newPlanId, effective }` — validated locally.
 * @returns ServiceResponse with the flat union on success.
 */
export async function changePlan(
	payload: ChangePlanPayload,
): Promise<
	ServiceResponse<UpsertChangePlanResponseDto, SubscriptionErrorCode>
> {
	// Resolve session up-front for analytics attribution regardless of which
	// branch we exit from. Same pattern as the other subscription actions.
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Validate payload locally — `subscriptionId` is interpolated
		// into the request URL, so a non-UUID must never leave the action.
		// `validation_error` over the subscription-domain `not-found` because
		// a malformed UUID is a client-side payload defect, not a missing row.
		// The toast copy stays generic ("we couldn't switch your plan, try
		// again") via the dialog's fallback path.
		const validation = changePlanPayloadSchema.safeParse(payload);
		if (!validation.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Build canonical success / cancel URLs under our own origin.
		// Routed to /profile because subscription management now lives there;
		// pricing remains acquisition-only per the new IA. Caller-supplied URLs
		// in the payload win when present — preserves a future "checkout
		// success returns to a deep link" flow without surface changes here.
		const successUrl =
			validation.data.successUrl ??
			new URL('/profile?status=success#subscription', env.APP_URL).toString();
		const cancelUrl =
			validation.data.cancelUrl ??
			new URL('/profile?status=cancel#subscription', env.APP_URL).toString();

		// Step 3: Hit the backend. Body is `{ newPlanId, effective, successUrl,
		// cancelUrl }` — no provider field; the dispatcher auto-detects from the
		// existing subscription row. `encodeURIComponent` belt-and-braces since
		// the local UUID validation already rejects anything outside `[0-9a-f-]`.
		const response = await authenticatedClient.patch(
			`/subscriptions/${encodeURIComponent(validation.data.subscriptionId)}`,
			{
				newPlanId: validation.data.newPlanId,
				effective: validation.data.effective,
				successUrl,
				cancelUrl,
			},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 4: Parse the flat union. Discriminated on `kind` — a renamed
		// discriminator lands as contract drift, not a silent variant fallback.
		const data = upsertChangePlanResponseSchema.parse(response.data);

		// Step 5: Invalidate subscription-aware surfaces. Skipped on the
		// `redirect` branch because the swap is not yet durable (user still has
		// to complete the Fanbasis checkout); we revalidate again on the post-
		// checkout webhook landing path.
		if (data.kind !== 'redirect') {
			revalidateMySubscription();
		}

		// Step 6: Analytics — fire-and-forget so the dialog transition / nav
		// never waits on the Mixpanel hop. Re-use the existing
		// `CHECKOUT_REDIRECTED` event for the redirect branch so the funnel
		// continues to pick up Fanbasis plan-change checkouts without a
		// dedicated dashboard split.
		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.CHECKOUT_REDIRECTED,
			{
				plan_id: validation.data.newPlanId,
				subscription_id: validation.data.subscriptionId,
				effective: validation.data.effective,
				outcome: data.kind,
			},
			{ userId },
		);

		return success(data);
	} catch (error) {
		// Step 7: Contract drift fingerprinted separately so a real backend
		// regression shows up as one Sentry issue, not N Zod failures.
		if (error instanceof ZodError) {
			captureContractDrift(error, 'subscription', 'change-plan');
			return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		// Step 8: Map through the subscription domain mapper. Expected codes
		// (plan-not-found, already-subscribed, provider-locked, etc.) drop in
		// the Sentry filter via EXPECTED_ERROR_CODES.
		const errorCode = mapSubscriptionError(error);
		captureServiceError(error, errorCode, {
			service: 'subscription',
			action: 'change-plan',
		});

		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.FAILED,
			{
				action: 'change-plan',
				plan_id: payload.newPlanId,
				subscription_id: payload.subscriptionId,
				effective: payload.effective,
				error_code: errorCode,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
