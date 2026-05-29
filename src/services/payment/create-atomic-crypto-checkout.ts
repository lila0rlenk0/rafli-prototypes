'use server';

import { ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapPaymentError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	atomicCryptoCheckoutPayloadSchema,
	atomicCryptoCheckoutResponseSchema,
	type AtomicCryptoCheckoutPayload,
	type AtomicCryptoCheckoutResponse,
} from '@/types/wallet';

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
	const sessionPromise = getSession();

	try {
		// Step 1: Validate input — defense-in-depth before forwarding to backend
		const parsed = atomicCryptoCheckoutPayloadSchema.safeParse(payload);
		if (!parsed.success) {
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		// Step 2: Create order + crypto session atomically — backend handles reuse & promo
		const response = await authenticatedClient.post(
			'/payments/crypto/atomic-checkout',
			parsed.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 3: Validate response — `session` is null when order is $0 (fully discounted)
		const data = atomicCryptoCheckoutResponseSchema.parse(response.data);

		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
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
			raffleId: payload.raffleId,
			chainId: payload.chainId,
			quantity: payload.ticketQuantity,
			walletAddress: payload.walletAddress,
		});
		return failure(errorCode);
	}
}
