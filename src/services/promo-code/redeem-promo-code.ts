'use server';

import { ZodError, z } from 'zod';

import { PROMO_CODE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	PROMO_CODE_ERROR_CODES,
	type PromoCodeErrorCode,
} from '@/types/errors';
import { promoCodeStringSchema, promoCodeTypeSchema } from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for redeem request payload
 * Uses centralized promoCodeStringSchema for format validation
 */
const redeemPromoCodePayloadSchema = z.object({
	code: promoCodeStringSchema,
	raffleId: z.string().uuid(),
	orderId: z.string().uuid().optional(),
});

/**
 * Schema for redeem response from backend
 */
const redeemPromoCodeResponseSchema = z.object({
	redemptionId: z.string(),
	type: promoCodeTypeSchema,
	ticketsGranted: z.number().optional(),
	discountAmount: z.string().optional(),
});

// ==========================================
// Types
// ==========================================

export type RedeemPromoCodePayload = z.infer<
	typeof redeemPromoCodePayloadSchema
>;
export type RedeemPromoCodeResponse = z.infer<
	typeof redeemPromoCodeResponseSchema
>;

// ==========================================
// Service
// ==========================================

/**
 * Redeems a promo code for a specific raffle
 *
 * For free_tickets type: Issues tickets directly, no orderId needed
 * For discount types: Requires orderId to apply discount
 *
 * @param payload - Redeem request data (code, raffleId, optional orderId)
 * @returns ServiceResponse with redemption result or error code
 */
export async function redeemPromoCode(
	payload: RedeemPromoCodePayload,
): Promise<ServiceResponse<RedeemPromoCodeResponse, PromoCodeErrorCode>> {
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		// Step 1: Validate payload.
		const validationResult = redeemPromoCodePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			console.error(
				'Redeem payload validation failed:',
				validationResult.error,
			);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}

		// Step 2: Send redeem request (schema uppercases code).
		const response = await authenticatedClient.post('/promo-codes/redeem', {
			code: validationResult.data.code,
			raffleId: validationResult.data.raffleId,
			...(validationResult.data.orderId && {
				orderId: validationResult.data.orderId,
			}),
		});

		// Step 3: Validate response and return success.
		const validated = redeemPromoCodeResponseSchema.parse(response.data);

		// Track promo code redeemed (awaited to ensure completion in serverless)
		await trackServer(
			PROMO_CODE_EVENTS.REDEEMED,
			{
				code: validationResult.data.code,
				raffle_id: validationResult.data.raffleId,
				type: validated.type,
				tickets_granted: validated.ticketsGranted,
				discount_amount: validated.discountAmount,
			},
			{ userId },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'redeem-promo-code');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
