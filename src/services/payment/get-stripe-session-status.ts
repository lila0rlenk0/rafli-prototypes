'use server';

import { z, ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapPaymentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Schema
// ==========================================

/**
 * Stripe session status — backend-verified, not blindly trusting the redirect.
 * 'paid' = payment confirmed, 'unpaid' = still processing, 'expired' = session timed out.
 */
const stripeSessionStatusSchema = z.object({
	orderId: z.string(),
	status: z.enum(['paid', 'unpaid', 'expired']),
});

export type StripeSessionStatus = z.infer<typeof stripeSessionStatusSchema>;

// ==========================================
// Server Action
// ==========================================

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
		const response = await authenticatedClient.get(
			`/payments/stripe/sessions/${encodeURIComponent(sessionId)}/status`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		const data = stripeSessionStatusSchema.parse(response.data);

		// Track purchase completed when Stripe confirms payment
		if (data.status === 'paid') {
			void sessionPromise.then(session =>
				trackServer(
					PURCHASE_EVENTS.COMPLETED,
					{
						order_id: data.orderId,
						payment_method: 'stripe',
						stripe_session_id: sessionId,
					},
					{ userId: session?.user?.id },
				),
			);
		}

		// Track Stripe failures — expired sessions or unpaid terminal states
		if (data.status === 'expired') {
			void sessionPromise.then(session =>
				trackServer(
					PURCHASE_EVENTS.FAILED,
					{
						order_id: data.orderId,
						payment_method: 'stripe',
						stripe_session_id: sessionId,
						failure_reason: data.status,
					},
					{ userId: session?.user?.id },
				),
			);
		}

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-stripe-session-status');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
