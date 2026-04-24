'use server';

import { z, ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapPaymentError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Stripe session status — backend-verified, not blindly trusting the redirect.
 * 'paid' = payment confirmed, 'unpaid' = still processing, 'expired' = session timed out.
 */
const stripeSessionStatusSchema = z.object({
	orderId: z.string(),
	status: z.enum(['paid', 'unpaid', 'expired']),
});

export type StripeSessionStatus = z.infer<typeof stripeSessionStatusSchema>;

/**
 * Verifies a Stripe checkout session's actual payment status.
 *
 * Called after Stripe redirect to show real status instead of blind "success".
 * Backend checks Stripe API directly — prevents false-positive success screens
 * from URL manipulation or expired sessions.
 *
 * @param sessionId - Stripe checkout session ID from URL params
 * @returns ServiceResponse with verified session status or error code
 */
export async function getStripeSessionStatus(
	sessionId: string,
): Promise<ServiceResponse<StripeSessionStatus, PaymentErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Verify session status against Stripe API (backend-verified, not from redirect URL)
		const response = await authenticatedClient.get(
			`/payments/stripe/sessions/${encodeURIComponent(sessionId)}/status`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		// Step 2: Validate response shape
		const data = stripeSessionStatusSchema.parse(response.data);

		// Step 3+4: Must `await` trackAfter — it resolves IP via headers() in
		// request scope then defers Mixpanel via after(). `void trackAfter(...)`
		// would run headers() post-response and throw.
		if (data.status === 'paid' || data.status === 'expired') {
			const session = await sessionPromise;
			const event =
				data.status === 'paid'
					? PURCHASE_EVENTS.COMPLETED
					: PURCHASE_EVENTS.FAILED;

			await trackAfter(
				event,
				{
					order_id: data.orderId,
					payment_method: 'stripe',
					stripe_session_id: sessionId,
					...(data.status === 'expired' && { failure_reason: data.status }),
				},
				{ userId: session?.user?.id },
			);
		}

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-stripe-session-status');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		// Payment is a critical service — capture for Sentry alerting
		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'get-stripe-session-status',
			sessionId,
		});
		return failure(errorCode);
	}
}
