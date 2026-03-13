'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Response Schema
// ==========================================

/**
 * Schema for cancel payment session response.
 * Backend only cancels Stripe sessions — crypto sessions are managed separately.
 * cancelledMethod is 'stripe' when a session was cancelled, null when no-op.
 */
const cancelPaymentSessionResponseSchema = z.object({
	cancelled: z.boolean(),
	cancelledMethod: z.literal('stripe').nullable(),
});

type CancelPaymentSessionResponse = z.infer<
	typeof cancelPaymentSessionResponseSchema
>;

// ==========================================
// Service
// ==========================================

/**
 * Cancels the active Stripe payment session for an order.
 *
 * Idempotent — safe to call even if no session is active.
 * Used before switching payment methods to clear cross-method guards:
 * - Stripe → Crypto: cancels pending Stripe session
 * - Crypto → Stripe: backend rejects while any crypto session is still active
 *
 * Rejects with `payments:cancel:crypto-active` if crypto checkout must be resumed.
 *
 * @param orderId - Order ID whose active session to cancel
 * @returns ServiceResponse with cancellation result or error code
 */
export async function cancelPaymentSession(
	orderId: string,
): Promise<ServiceResponse<CancelPaymentSessionResponse, PaymentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			`/payments/${orderId}/cancel`,
			{},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const data = cancelPaymentSessionResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Cancel session response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.CANCEL_SESSION_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
