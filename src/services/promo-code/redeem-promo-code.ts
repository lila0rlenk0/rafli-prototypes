'use server';

import { ZodError, z } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { PROMO_CODE_ERROR_CODES, type PromoCodeErrorCode } from '@/types/errors';
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

export type RedeemPromoCodePayload = z.infer<typeof redeemPromoCodePayloadSchema>;
export type RedeemPromoCodeResponse = z.infer<typeof redeemPromoCodeResponseSchema>;

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
	try {
		// Validate payload
		const validationResult = redeemPromoCodePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			console.error('Redeem payload validation failed:', validationResult.error);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}

		// Schema already transforms code to uppercase
		const response = await authenticatedClient.post(
			'/promo-codes/redeem',
			{
				code: validationResult.data.code,
				raffleId: validationResult.data.raffleId,
				...(validationResult.data.orderId && { orderId: validationResult.data.orderId }),
			},
		);

		const validated = redeemPromoCodeResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Redeem response parse error:', error);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
