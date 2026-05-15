'use server';

import { ZodError } from 'zod';

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
	type CancelScheduledChangeResponse,
	cancelScheduledChangeResponseSchema,
	cancelSubscriptionPayloadSchema,
	type CancelSubscriptionPayload,
} from '@/types/subscription';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Cancels a queued scheduled-change (downgrade) on the authenticated user's
 * subscription, restoring the current plan as the renewal target.
 *
 * Endpoint: `DELETE /subscriptions/:id/scheduled-change` (auth required).
 * Stripe-only by construction: Fanbasis subscriptions cannot have a pending
 * change because the dispatcher rejects `'period_end'` upfront, so this
 * action only ever fires on the Stripe rail. Idempotent — re-cancelling a
 * subscription with no pending change still returns `{ status:
 * 'no-pending-change' }`.
 *
 * @param payload - `{ subscriptionId }` — validated locally before building the URL.
 * @returns ServiceResponse with `{ status: 'no-pending-change' }` on success.
 */
export async function cancelScheduledChange(
	payload: CancelSubscriptionPayload,
): Promise<
	ServiceResponse<CancelScheduledChangeResponse, SubscriptionErrorCode>
> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Validate payload locally — short-circuit malformed UUIDs
		// before the network round-trip. The id is interpolated into the URL,
		// so a tampered value should never leave the action. `validation_error`
		// over `not-found` because a malformed UUID is a client-side payload
		// defect, not a missing subscription row.
		const validation = cancelSubscriptionPayloadSchema.safeParse(payload);
		if (!validation.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 2: Hit the backend. Ownership + state checks live server-side.
		const response = await authenticatedClient.delete(
			`/subscriptions/${encodeURIComponent(validation.data.subscriptionId)}/scheduled-change`,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate response shape. Single-literal status — drift here
		// almost certainly means a renamed payload key, fingerprinted as such.
		const data = cancelScheduledChangeResponseSchema.parse(response.data);

		// Step 4: Refresh subscription-aware surfaces so the scheduled-change
		// banner clears and the change-plan dialog re-enables its CTAs.
		revalidateMySubscription();

		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.CANCEL_CONFIRMED,
			{
				action: 'cancel-scheduled-change',
				subscription_id: validation.data.subscriptionId,
			},
			{ userId },
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'subscription', 'cancel-scheduled-change');
			return failure(SUBSCRIPTION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapSubscriptionError(error);
		captureServiceError(error, errorCode, {
			service: 'subscription',
			action: 'cancel-scheduled-change',
		});

		const userId = (await sessionPromise)?.user?.id;
		await trackAfter(
			SUBSCRIPTION_EVENTS.FAILED,
			{
				action: 'cancel-scheduled-change',
				error_code: errorCode,
				subscription_id: payload.subscriptionId,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
