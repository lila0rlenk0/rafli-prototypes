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
import type { ServiceResponse } from '@/types/service-response';
import {
	atomicCryptoCheckoutResponseSchema,
	type AtomicCryptoCheckoutPayload,
	type AtomicCryptoCheckoutResponse,
} from '@/types/wallet';

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
	const sessionPromise = Promise.resolve(getSession());

	try {
		const response = await authenticatedClient.post(
			'/payments/crypto/atomic-checkout',
			payload,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const data = atomicCryptoCheckoutResponseSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.CRYPTO_CHECKOUT_STARTED,
				{
					order_id: data.order.id,
					raffle_id: payload.raffleId,
					chain_id: payload.chainId,
					amount: data.order.totalAmount,
					ticket_quantity: payload.ticketQuantity,
					has_promo: !!payload.promoCode,
				},
				{ userId },
			);
		});

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'create-atomic-crypto-checkout');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'create-atomic-crypto-checkout',
		});
		return failure(errorCode);
	}
}
