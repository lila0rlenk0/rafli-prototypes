'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import type { SubmitCryptoTxPayload } from '@/types/wallet';

/**
 * Schema for crypto tx submission response
 * Backend returns session ID and updated status after verifying the tx
 */
const cryptoTxSubmitResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
});

type CryptoTxSubmitResponse = z.infer<typeof cryptoTxSubmitResponseSchema>;

/**
 * Submits a crypto transaction hash for verification
 *
 * Called after the user sends an ERC20 transfer and the tx is included on-chain.
 * Backend verifies the tx matches the checkout session parameters.
 *
 * @param payload - Session ID and transaction hash
 * @returns ServiceResponse with session status or error code
 */
export async function submitCryptoTx(
	payload: SubmitCryptoTxPayload,
): Promise<ServiceResponse<CryptoTxSubmitResponse, PaymentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			'/payments/crypto/submit',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const data = cryptoTxSubmitResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Crypto tx submit response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.CRYPTO_SUBMIT_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
