'use server';

import { ZodError } from 'zod';

import { env } from '@/env/server';
import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
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
 * Response type for checkout session creation
 */
type CreateCheckoutSessionResponse = ServiceResponse<
	CheckoutSessionResponse,
	PaymentErrorCode
>;

/**
 * Creates a Stripe Checkout Session for an order
 *
 * @param payload - Checkout creation data (orderId, raffleId)
 * @returns ServiceResponse with checkout session data on success, PaymentErrorCode on failure
 */
export async function createCheckoutSession(
	payload: CreateCheckoutPayload,
): Promise<CreateCheckoutSessionResponse> {
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		// Validate payload before sending
		const validationResult = createCheckoutPayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			console.error(
				'Checkout payload validation failed:',
				validationResult.error,
			);
			return failure(PAYMENT_ERROR_CODES.CHECKOUT_FAILED);
		}

		const { orderId, publicSlug } = validationResult.data;

		// Use publicSlug for URL construction (matches the page route).
		// encodeURIComponent prevents path traversal via malformed slugs.
		const baseUrl = new URL(
			`/browse/${encodeURIComponent(publicSlug)}`,
			env.APP_URL,
		);

		// BE createCheckoutDtoSchema only accepts { orderId, successUrl, cancelUrl }
		const response = await authenticatedClient.post(
			'/payments/checkout',
			{
				orderId,
				successUrl: baseUrl.toString(),
				cancelUrl: baseUrl.toString(),
			},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Validate response structure
		const checkoutSession = checkoutSessionResponseSchema.parse(response.data);

		// Fire-and-forget — analytics latency must not delay checkout redirect
		void trackServer(
			PURCHASE_EVENTS.CHECKOUT_STARTED,
			{
				order_id: orderId,
				session_id: checkoutSession.id,
			},
			{ userId },
		);

		return success(checkoutSession);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'create-checkout-session');
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		// Log full error for debugging
		console.error('Checkout session creation error:', error);

		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'create-checkout-session',
			orderId: payload.orderId,
		});

		// Track checkout failed (awaited to ensure completion in serverless)
		await trackServer(
			PURCHASE_EVENTS.FAILED,
			{ order_id: payload.orderId, error_code: errorCode },
			{ userId },
		);

		return failure(errorCode);
	}
}
