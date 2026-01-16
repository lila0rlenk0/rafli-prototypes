'use server';

import { env } from '@/env/server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type {
	CheckoutSessionResponse,
	CreateCheckoutPayload,
} from '@/types/payment';
import {
	checkoutSessionResponseSchema,
	createCheckoutPayloadSchema,
} from '@/types/payment';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

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

		const { orderId, raffleId } = validationResult.data;

		// raffleId can be either ID or publicSlug - backend accepts both
		const baseUrl = new URL(`/browse/${raffleId}`, env.APP_URL);

		const response = await authenticatedClient.post(
			'/payments/checkout',
			{
				orderId,
				raffleId,
				successUrl: baseUrl.toString(),
				cancelUrl: baseUrl.toString(),
			},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Validate response structure
		const checkoutSession = checkoutSessionResponseSchema.parse(response.data);

		return success(checkoutSession);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			console.error('Checkout response validation failed:', error);
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		// Log full error for debugging
		console.error('Checkout session creation error:', error);

		const errorCode = mapPaymentError(error);
		return failure(errorCode);
	}
}
