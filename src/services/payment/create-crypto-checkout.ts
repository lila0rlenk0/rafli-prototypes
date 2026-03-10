'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import type {
	CreateCryptoCheckoutPayload,
	CryptoCheckoutSession,
} from '@/types/wallet';
import { cryptoCheckoutSessionSchema } from '@/types/wallet';

/**
 * Creates a crypto checkout session for an order
 *
 * Returns token contract address, treasury address, and raw amount
 * for the frontend to construct an ERC20 transfer transaction.
 *
 * @param payload - Order ID, chain ID, wallet address, optional token
 * @returns ServiceResponse with crypto checkout session or error code
 */
export async function createCryptoCheckout(
	payload: CreateCryptoCheckoutPayload,
): Promise<ServiceResponse<CryptoCheckoutSession, PaymentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			'/payments/crypto/checkout',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const session = cryptoCheckoutSessionSchema.parse(response.data);
		return success(session);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Crypto checkout response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.CRYPTO_CHECKOUT_FAILED);
		}

		const mapped = mapPaymentError(error);
		// Log full backend response body for debugging
		const axiosErr = error as { response?: { status?: number; data?: unknown } };
		console.error(
			'[createCryptoCheckout] response body:',
			JSON.stringify(axiosErr?.response?.data, null, 2),
		);
		return failure(mapped);
	}
}
