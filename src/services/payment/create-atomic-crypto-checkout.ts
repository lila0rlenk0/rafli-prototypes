'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	atomicCryptoCheckoutResponseSchema,
	type AtomicCryptoCheckoutResponse,
} from '@/types/wallet';

// ==========================================
// Schema
// ==========================================

/** Schema for the atomic crypto checkout request payload */
export const atomicCryptoCheckoutPayloadSchema = z.object({
	raffleId: z.string(),
	ticketQuantity: z.number().int().positive(),
	promoCode: z.string().optional(),
	chainId: z.number().int().positive(),
	walletAddress: z.string().min(1),
	token: z.string().min(1),
});

// ==========================================
// Types
// ==========================================

export type AtomicCryptoCheckoutPayload = z.infer<
	typeof atomicCryptoCheckoutPayloadSchema
>;

// ==========================================
// Server Action
// ==========================================

/**
 * Creates order + crypto session atomically in a single backend call.
 *
 * Replaces the previous 3-step waterfall (buildCheckoutOrder → cancelPaymentSession
 * → createCryptoCheckout) with one POST /payments/crypto/atomic-checkout.
 * Backend handles order reuse, promo redemption, cross-method cancellation,
 * and session creation in a single transaction.
 *
 * `session` is null when the order is $0 (fully discounted by promo).
 *
 * @param payload - Raffle, ticket, chain, wallet, and token details
 * @returns ServiceResponse with order + session or error code
 */
export async function createAtomicCryptoCheckout(
	payload: AtomicCryptoCheckoutPayload,
): Promise<ServiceResponse<AtomicCryptoCheckoutResponse, PaymentErrorCode>> {
	try {
		const response = await authenticatedClient.post(
			'/payments/crypto/atomic-checkout',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const data = atomicCryptoCheckoutResponseSchema.parse(response.data);
		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error(
				'Atomic crypto checkout response validation failed:',
				error,
			);
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
