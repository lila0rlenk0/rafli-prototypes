'use server';

import { runAfter } from '@/lib/run-after';
import { ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapPaymentError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import {
	cryptoTxMutationResponseSchema,
	type CryptoTxMutationResponse,
} from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';
import type { SubmitCryptoTxPayload } from '@/types/wallet';

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
): Promise<ServiceResponse<CryptoTxMutationResponse, PaymentErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Submit tx hash to backend for verification against session parameters
		const response = await authenticatedClient.post(
			'/payments/crypto/submit',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 2: Validate response shape
		const data = cryptoTxMutationResponseSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.CRYPTO_TX_SUBMITTED,
				{
					session_id: payload.sessionId,
					tx_hash: payload.txHash,
				},
				{ userId },
			);
		});

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'submit-crypto-tx');
			return failure(PAYMENT_ERROR_CODES.CRYPTO_SUBMIT_FAILED);
		}

		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'submit-crypto-tx',
			sessionId: payload.sessionId,
			txHash: payload.txHash,
		});
		return failure(errorCode);
	}
}
