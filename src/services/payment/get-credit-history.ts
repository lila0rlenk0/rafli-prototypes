'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapPaymentError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { COMMON_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	creditHistoryResponseSchema,
	type CreditHistoryQuery,
	type CreditHistoryResponse,
} from '@/types/credits';

/**
 * Fetches the current user's paginated credit history (newest first).
 *
 * Each entry contains type (grant/spend/reversal), amount, balanceAfter,
 * reason, and optional reference metadata.
 *
 * @param query - Pagination params (page, limit)
 * @returns ServiceResponse with paginated credit history or error code
 */
export async function getCreditHistory(
	query?: CreditHistoryQuery,
): Promise<ServiceResponse<CreditHistoryResponse, PaymentErrorCode>> {
	try {
		const response = await authenticatedClient.get('/me/credits/history', {
			params: {
				page: query?.page ?? 1,
				limit: query?.limit ?? 10,
			},
			timeout: API_TIMEOUTS.QUERY,
		});

		const data = creditHistoryResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-credit-history');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		return failure(mapPaymentError(error));
	}
}
