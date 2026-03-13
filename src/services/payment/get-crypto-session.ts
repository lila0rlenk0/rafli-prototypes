'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import { cryptoPaymentStatusSchema } from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Schema
// ==========================================

/**
 * Schema for crypto session polling response.
 * Returned by GET /payments/crypto/sessions/:id.
 * Contains authoritative session state + failure reason for error display.
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
});

export type CryptoSessionResponse = z.infer<typeof cryptoSessionResponseSchema>;

// ==========================================
// Server Action
// ==========================================

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
		const response = await authenticatedClient.get(
			`/payments/crypto/sessions/${sessionId}`,
			{ timeout: API_TIMEOUTS.QUERY },
		);

		const data = cryptoSessionResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Crypto session response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND);
		}

		return failure(mapPaymentError(error));
	}
}
