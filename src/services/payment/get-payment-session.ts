'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { PaymentSession } from '@/types/payment';
import { paymentSessionSchema } from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for payment session fetch
 */
type GetPaymentSessionResponse = ServiceResponse<
	PaymentSession,
	PaymentErrorCode
>;

/**
 * Fetches the status and details of a payment session
 *
 * @param sessionId - The ID of the payment session (Encore UUID or Stripe Session ID if supported)
 * @returns ServiceResponse with payment session data on success, PaymentErrorCode on failure
 */
export async function getPaymentSession(
	sessionId: string,
): Promise<GetPaymentSessionResponse> {
	try {
		const response = await authenticatedClient.get(
			`/payments/sessions/${sessionId}`,
			{
				timeout: API_TIMEOUTS.QUERY,
			},
		);

		// Validate response structure
		const session = paymentSessionSchema.parse(response.data);

		return success(session);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			console.error('Payment session response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapPaymentError(error);
		return failure(errorCode);
	}
}
