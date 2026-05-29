'use server';

import { z, ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapPaymentError, success } from '@/lib/errors';
import { pathParam } from '@/lib/utils/routing/path-param';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/** Backend returns whether the order was actually abandoned */
const abandonOrderResponseSchema = z.object({
	abandoned: z.boolean(),
});

type AbandonOrderResponse = z.infer<typeof abandonOrderResponseSchema>;

/**
 * Abandons a pending order that the user decided not to pay.
 *
 * Best-effort cleanup — called when user closes checkout modal before sending tx.
 * Allows backend to reclaim the order slot and prevents ghost pending orders
 * from cluttering payment history.
 *
 * @param orderId - Order ID to abandon
 * @returns ServiceResponse with abandon result or error code
 */
export async function abandonOrder(
	orderId: string,
	paymentMethod?: string,
): Promise<ServiceResponse<AbandonOrderResponse, PaymentErrorCode>> {
	const sessionPromise = getSession();

	try {
		// Step 1: Request order abandonment — best-effort, reclaims backend order slot
		const response = await authenticatedClient.post(
			`/payments/orders/${pathParam(orderId)}/abandon`,
			{},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Step 2: Validate response shape
		const data = abandonOrderResponseSchema.parse(response.data);

		// Step 3: Must `await` trackAfter — it resolves IP via headers() in
		// request scope then defers Mixpanel via after(). `void trackAfter(...)`
		// would run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			PURCHASE_EVENTS.ORDER_ABANDONED,
			{
				order_id: orderId,
				...(paymentMethod && { payment_method: paymentMethod }),
			},
			{ userId: session?.user?.id },
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'payment', 'abandon-order');
			// FETCH_FAILED is the closest generic code — abandon is best-effort so callers
			// treat all failures the same (fire-and-forget), making a dedicated code unnecessary.
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		// Payment is a critical service — capture even best-effort failures for alerting
		const errorCode = mapPaymentError(error);
		captureServiceError(error, errorCode, {
			service: 'payment',
			action: 'abandon-order',
			orderId,
		});
		return failure(errorCode);
	}
}
