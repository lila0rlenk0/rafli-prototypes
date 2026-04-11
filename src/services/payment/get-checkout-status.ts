'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapPaymentError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	checkoutStatusSchema,
	type CheckoutStatus,
} from '@/types/checkout-status';

/**
 * Fetches unified checkout status for an order.
 *
 * Single endpoint replaces multi-call hydration (getOrder + getCryptoSession
 * + FE guard functions). Backend merges order state, session state, and
 * actionability flags into one response.
 *
 * @param orderId - Order ID to check
 * @returns ServiceResponse with unified checkout status or error code
 */
export async function getCheckoutStatus(
	orderId: string,
): Promise<ServiceResponse<CheckoutStatus, PaymentErrorCode>> {
	try {
		// Step 1: Fetch unified checkout status from backend
		const response = await authenticatedClient.get(
			`/payments/checkout-status/${encodeURIComponent(orderId)}`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		// Step 2: Validate response — checkout status drives payment UX decisions
		return success(checkoutStatusSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-checkout-status');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		// Payment is a critical service — capture for Sentry alerting
		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'get-checkout-status',
			orderId,
		});
		return failure(errorCode);
	}
}
