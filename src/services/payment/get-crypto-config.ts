'use server';

import { ZodError } from 'zod';

import { baseClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { captureContractDrift } from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import { cryptoConfigSchema, type CryptoConfig } from '@/types/crypto-config';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches the global crypto payment configuration.
 *
 * Public endpoint (no auth) — returns chain metadata (names, explorer URLs,
 * confirmation targets) that was previously hardcoded in the frontend.
 * Called once per session and cached via React Query.
 *
 * @returns ServiceResponse with crypto config or error code
 */
export async function getCryptoConfig(): Promise<
	ServiceResponse<CryptoConfig, PaymentErrorCode>
> {
	try {
		const response = await baseClient.get('/payments/crypto/config', {
			timeout: API_TIMEOUTS.QUERY,
		});

		const data = cryptoConfigSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-crypto-config');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
