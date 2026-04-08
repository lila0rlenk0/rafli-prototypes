'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { captureContractDrift } from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	checkoutStatusSchema,
	type CheckoutStatus,
} from '@/types/checkout-status';

// ==========================================
// Server Action
// ==========================================

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
		const response = await authenticatedClient.get(
			`/payments/checkout-status/${encodeURIComponent(orderId)}`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		const data = checkoutStatusSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-checkout-status');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
