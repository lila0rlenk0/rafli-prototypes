'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import type { ConfirmCryptoTxPayload } from '@/types/wallet';

/**
 * Schema for crypto tx confirmation response.
 * Backend returns order status — COMPLETED means tickets were created immediately,
 * any other status means the cron will handle it (no-op from FE perspective).
 */
const confirmCryptoTxResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
});

type ConfirmCryptoTxResponse = z.infer<typeof confirmCryptoTxResponseSchema>;

/**
 * Requests backend to finalize a crypto payment immediately.
 *
 * Called when on-chain confirmations reach the chain's target threshold.
 * This is an optimization — if the backend cron hasn't processed the tx yet,
 * this endpoint validates and finalizes it synchronously, improving UX.
 *
 * If the order is already COMPLETED (cron beat us), backend returns COMPLETED — idempotent.
 * If the tx hasn't been submitted yet, backend returns an appropriate error.
 *
 * @param payload - Session ID, tx hash, chain ID, and observed confirmation count
 * @returns ServiceResponse with order status or error code
 */
export async function confirmCryptoTx(
	payload: ConfirmCryptoTxPayload,
): Promise<ServiceResponse<ConfirmCryptoTxResponse, PaymentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			'/payments/crypto/confirm',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const data = confirmCryptoTxResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Crypto tx confirm response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
