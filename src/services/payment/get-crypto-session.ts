'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapPaymentError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import { cryptoPaymentStatusSchema } from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Schema for crypto session polling response.
 * Returned by GET /payments/crypto/sessions/:id.
 * Contains authoritative session state + failure reason for error display.
 * `confirmDeadline` and `confirmationTarget` are always present — backend guarantees non-null.
 */
const cryptoSessionResponseSchema = z.object({
	id: z.string(),
	status: cryptoPaymentStatusSchema,
	/** Transaction hash — null until submitted via POST /crypto/submit */
	txHash: z.string().nullable(),
	/** Human-readable failure reason from backend verification (e.g. "Transaction reverted") */
	failureReason: z.string().nullable(),
	amount: z.string(),
	currency: z.string(),
	chainId: z.number(),
	orderId: z.string(),
	/** ISO timestamp when session was completed — null until completed */
	completedAt: z.string().nullable(),
	expiresAt: z.string(),
	/** Absolute deadline for tx hash submission — always present */
	submitDeadline: z.string(),
	/** Absolute deadline for on-chain confirmations — backend always provides this */
	confirmDeadline: z.string(),
	/** Number of on-chain confirmations required — from backend session, not FE config */
	confirmationTarget: z.number(),
});

export type CryptoSessionResponse = z.infer<typeof cryptoSessionResponseSchema>;

/**
 * Fetches current state of a crypto payment session.
 *
 * Used for authoritative session polling alongside FE's on-chain tracking.
 * Returns `failureReason` which the order endpoint does not expose —
 * critical for showing users actionable error messages on payment failure.
 *
 * @param sessionId - Crypto session ID from POST /payments/crypto/checkout
 * @returns ServiceResponse with session data or error code
 */
export async function getCryptoSession(
	sessionId: string,
): Promise<ServiceResponse<CryptoSessionResponse, PaymentErrorCode>> {
	try {
		// Step 1: Fetch authoritative session state from backend
		const response = await authenticatedClient.get(
			`/payments/crypto/sessions/${encodeURIComponent(sessionId)}`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		// Step 2: Validate response — crypto session data is critical for payment flow
		return success(cryptoSessionResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'get-crypto-session');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		// Crypto is a critical service — capture for Sentry alerting
		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'get-crypto-session',
			sessionId,
		});
		return failure(errorCode);
	}
}
