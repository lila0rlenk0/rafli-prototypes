'use server';

import { ZodError } from 'zod';

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
import { COMMON_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	spendCreditsResponseSchema,
	type SpendCreditsResponse,
} from '@/types/credits';

/**
 * Pays for a pending order using platform credits.
 *
 * Instant settlement — no redirect, no polling. Backend atomically
 * debits the user's credit balance and completes the order in a single
 * transaction. If balance is insufficient, returns insufficient-balance
 * error without modifying anything.
 *
 * @param orderId - ID of the pending order to pay for
 * @returns ServiceResponse with balance after payment or error code
 */
export async function payWithCredits(
	orderId: string,
): Promise<ServiceResponse<SpendCreditsResponse, PaymentErrorCode>> {
	const sessionPromise = getSession();

	try {
		// Step 1: Non-blocking checkout-started analytics
		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			PURCHASE_EVENTS.CHECKOUT_STARTED,
			{
				order_id: orderId,
				payment_method: 'credits',
			},
			{ userId },
		);

		// Step 2: Atomically debit credits and complete order — instant settlement
		const response = await authenticatedClient.post(
			'/payments/credits/pay',
			{ orderId },
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate response — contains balance after payment
		const data = spendCreditsResponseSchema.parse(response.data);

		await trackAfter(
			PURCHASE_EVENTS.COMPLETED,
			{
				order_id: orderId,
				payment_method: 'credits',
				remaining_balance: data.balanceAfter,
			},
			{ userId },
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'pay-with-credits');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'pay-with-credits',
			orderId,
		});

		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			PURCHASE_EVENTS.FAILED,
			{
				order_id: orderId,
				payment_method: 'credits',
				error_code: errorCode,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
