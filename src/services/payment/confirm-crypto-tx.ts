'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapPaymentError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import {
	CRYPTO_PAYMENT_STATUS,
	cryptoTxMutationResponseSchema,
	type CryptoTxMutationResponse,
} from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';
import {
	confirmCryptoTxPayloadSchema,
	type ConfirmCryptoTxPayload,
} from '@/types/wallet';

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
): Promise<ServiceResponse<CryptoTxMutationResponse, PaymentErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Validate input — defense-in-depth before forwarding to backend
		const parsed = confirmCryptoTxPayloadSchema.safeParse(payload);
		if (!parsed.success) {
			return failure(PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED);
		}

		// Step 2: Request backend to finalize crypto payment — idempotent if already completed
		const response = await authenticatedClient.post(
			'/payments/crypto/confirm',
			parsed.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate response shape
		const data = cryptoTxMutationResponseSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.CRYPTO_TX_CONFIRMED,
				{
					session_id: payload.sessionId,
					tx_hash: payload.txHash,
					chain_id: payload.chainId,
					confirmations: payload.confirmations,
				},
				{ userId },
			);

			if (data.status !== CRYPTO_PAYMENT_STATUS.COMPLETED) return;

			await trackServer(
				PURCHASE_EVENTS.COMPLETED,
				{
					session_id: payload.sessionId,
					payment_method: 'crypto',
					chain_id: payload.chainId,
				},
				{ userId },
			);
		});

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'confirm-crypto-tx');
			return failure(PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED);
		}

		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'confirm-crypto-tx',
			sessionId: payload.sessionId,
			txHash: payload.txHash,
			chainId: payload.chainId,
		});

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.FAILED,
				{
					session_id: payload.sessionId,
					payment_method: 'crypto',
					error_code: errorCode,
				},
				{ userId },
			);
		});

		return failure(errorCode);
	}
}
