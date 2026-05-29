'use server';

import { ZodError } from 'zod';

import { SUBSCRIPTION_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { revalidateMySubscription } from '@/lib/cache/revalidation';
import { failure, mapSubscriptionError, success } from '@/lib/errors';
import { pathParam } from '@/lib/utils/routing/path-param';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import {
	SUBSCRIPTION_ERROR_CODES,
	type SubscriptionErrorCode,
} from '@/types/errors';
import {
	type CancelSubscriptionPayload,
	cancelSubscriptionPayloadSchema,
	type CancelSubscriptionResponse,
	cancelSubscriptionResponseSchema,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Cancels the authenticated user's subscription at end of billing period.
 *
 * Endpoint: `DELETE /subscriptions/:id` (auth required). Backend performs a
 * cancel-at-period-end on whichever provider owns the row — the user keeps
 * benefits until `expiresAt`, at which point the lifecycle reconcile cron
 * flips the row to `expired`. Reverses cleanly if the user re-subscribes
 * inside the grace window via the standard subscribe flow.
 *
 * Side effects: invalidates RSC caches for `/pricing` and `/profile` so the
 * cancel-card visibility gate, "My Sub" cell, and mint upsell banner all
 * reflect the new state on the next read.
 *
 * @param payload - `{ subscriptionId }` — validated locally before the URL is built.
 * @returns ServiceResponse with `{ expiresAt, status }` on success.
 */
export async function cancelSubscription(
	payload: CancelSubscriptionPayload,
): Promise<ServiceResponse<CancelSubscriptionResponse, SubscriptionErrorCode>> {
	// Resolve session up-front so analytics attribute the event to the right
	// user regardless of which branch we exit. Same pattern as subscribe-to-plan.
	const sessionPromise = getSession();

	try {
		// Step 1: Validate payload locally — short-circuit malformed UUIDs (e.g. a
		// stale cached page) before the network round-trip. NOT_FOUND is the
		// honest code: a non-UUID will never resolve to a real subscription.
		// Doubly important here because the id is interpolated into the request
		// URL — a tampered value should never leave the action.
		const validation = cancelSubscriptionPayloadSchema.safeParse(payload);
		if (!validation.success) {
			return failure(SUBSCRIPTION_ERROR_CODES.NOT_FOUND);
		}

		// Step 2: Hit the backend. Ownership and lifecycle gating (must be
		// active, not already cancelled) live server-side — surfaced here as
		// `payments:subscription:not-active` / `not-found` codes.
		// `pathParam` is belt-and-braces — the local UUID validation already
		// rejects anything outside `[0-9a-f-]`, but we keep the encode so
		// the rule "never interpolate raw values into URLs" reads cleanly.
		const response = await authenticatedClient.delete(
			`/subscriptions/${pathParam(validation.data.subscriptionId)}`,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate response shape. `expiresAt` powers the success
		// modal's grace-period copy, so a drift here lands in the catch as
		// ZodError → contract-drift fingerprint.
		const data = cancelSubscriptionResponseSchema.parse(response.data);

		// Step 4: Refresh subscription-aware surfaces. Path-based because no
		// subscription cache tag exists today (per `data-fetching.md`, only
		// MY_RAFFLES and RAFFLE_DETAIL carry tags).
		revalidateMySubscription();

		// Step 5: Funnel analytics — fire-and-forget so the dialog transition
		// never waits on the Mixpanel hop.
		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.CANCEL_CONFIRMED,
			{ subscription_id: validation.data.subscriptionId },
			{ userId },
		);

		return success(data);
	} catch (error) {
		// Step 6: Contract drift — fingerprinted separately so a real backend
		// regression shows up as one Sentry issue, not N Zod failures.
		if (error instanceof ZodError) {
			captureContractDrift(error, 'subscription', 'cancel-subscription');
			return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		// Step 7: Map domain error. NOT_FOUND / NOT_ACTIVE are in
		// `EXPECTED_ERROR_CODES` so `captureServiceError` drops them in the
		// Sentry filter — only real surprises (500s, network) reach the issue
		// stream. The captured one is still useful as a breadcrumb.
		const errorCode = mapSubscriptionError(error);
		captureServiceError(error, errorCode, {
			service: 'subscription',
			action: 'cancel-subscription',
		});

		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.FAILED,
			{
				action: 'cancel',
				error_code: errorCode,
				subscription_id: payload.subscriptionId,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
