'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
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
	try {
		const response = await authenticatedClient.get(
			`/payments/stripe/sessions/${sessionId}/status`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		const data = stripeSessionStatusSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Stripe session status response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
