'use server';

import { z, ZodError } from 'zod';

import { PURCHASE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { mapPaymentError } from '@/lib/errors/error-mapper';
import { PAYMENT_ERROR_CODES, type PaymentErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Schema
// ==========================================

/** Backend returns whether the order was actually abandoned */
const abandonOrderResponseSchema = z.object({
	abandoned: z.boolean(),
});

type AbandonOrderResponse = z.infer<typeof abandonOrderResponseSchema>;

// ==========================================
// Server Action
// ==========================================

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
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			`/payments/orders/${encodeURIComponent(orderId)}/abandon`,
			{},
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const data = abandonOrderResponseSchema.parse(response.data);

		// Fire-and-forget — abandon is best-effort, analytics must not block
		void trackServer(
			PURCHASE_EVENTS.ORDER_ABANDONED,
			{
				order_id: orderId,
				...(paymentMethod && { payment_method: paymentMethod }),
			},
			{ userId },
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Abandon order response validation failed:', error);
			// FETCH_FAILED is the closest generic code — abandon is best-effort so callers
			// treat all failures the same (fire-and-forget), making a dedicated code unnecessary.
			return failure(PAYMENT_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapPaymentError(error));
	}
}
