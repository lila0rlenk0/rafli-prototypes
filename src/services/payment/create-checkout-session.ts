'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError } from 'zod';

import { env } from '@/env/server';
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
	checkoutSessionResponseSchema,
	createCheckoutPayloadSchema,
	type CheckoutSessionResponse,
	type CreateCheckoutPayload,
} from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Creates a Stripe Checkout Session for an order.
 *
 * Validates the payload locally so we never hit the network with bad data.
 * Uses `publicSlug` for success/cancel URL construction — encodeURIComponent
 * prevents path traversal via malformed slugs.
 * BE `createCheckoutDtoSchema` only accepts `{ orderId, successUrl, cancelUrl }`.
 *
 * @param payload - Checkout creation data (orderId, raffleId)
 * @returns ServiceResponse with checkout session data on success, PaymentErrorCode on failure
 */
export async function createCheckoutSession(
	payload: CreateCheckoutPayload,
): Promise<ServiceResponse<CheckoutSessionResponse, PaymentErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Validate payload — reject bad data before network call
		const validationResult = createCheckoutPayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(PAYMENT_ERROR_CODES.CHECKOUT_FAILED);
		}

		// Step 2: Build success/cancel URLs — encodeURIComponent prevents path traversal
		const { orderId, publicSlug } = validationResult.data;
		const baseUrl = new URL(
			`/browse/${encodeURIComponent(publicSlug)}`,
			env.APP_URL,
		);

		// Step 3: Create Stripe checkout session — backend returns session URL for redirect
		const response = await authenticatedClient.post(
			'/payments/checkout',
			{
				orderId,
				successUrl: baseUrl.toString(),
				cancelUrl: baseUrl.toString(),
			},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 4: Validate response shape
		const checkoutSession = checkoutSessionResponseSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.CHECKOUT_STARTED,
				{
					order_id: orderId,
					session_id: checkoutSession.id,
					payment_method: 'stripe',
				},
				{ userId },
			);
		});

		return success(checkoutSession);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'create-checkout-session');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'create-checkout-session',
			orderId: payload.orderId,
		});

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PURCHASE_EVENTS.FAILED,
				{ order_id: payload.orderId, error_code: errorCode },
				{ userId },
			);
		});

		return failure(errorCode);
	}
}
