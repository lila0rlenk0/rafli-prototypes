'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapPaymentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	creditBalanceResponseSchema,
	type CreditBalanceResponse,
} from '@/types/credits';

/**
 * Fetches the current user's credit balance.
 *
 * Returns availableAmount, totalGranted, totalSpent as decimal strings.
 * Used in navbar badge, profile section, and checkout flow to determine
 * if credits payment is available.
 *
 * @returns ServiceResponse with credit balance or error code
 */
export async function getCreditBalance(): Promise<
	ServiceResponse<CreditBalanceResponse, PaymentErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/me/credits', {
			timeout: API_TIMEOUTS.QUERY,
		});

		const data = creditBalanceResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-credit-balance');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		return failure(mapPaymentError(error));
	}
}
