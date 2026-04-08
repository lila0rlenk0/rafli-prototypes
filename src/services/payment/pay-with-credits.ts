'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { captureServiceError } from '@/lib/sentry/capture';
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
	try {
		const response = await authenticatedClient.post(
			'/payments/credits/pay',
			{ orderId },
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const data = spendCreditsResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Credits pay response validation failed:', error);
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'pay-with-credits',
			orderId,
		});

		return failure(errorCode);
	}
}
