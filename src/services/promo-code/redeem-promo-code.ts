'use server';

import { runAfter } from '@/lib/run-after';
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

/**
 * Schema for redeem request payload.
 * Uses centralized promoCodeStringSchema for format validation (uppercases + trims).
 */
const redeemPromoCodePayloadSchema = z.object({
	code: promoCodeStringSchema,
	raffleId: z.string().uuid(),
	orderId: z.string().uuid().optional(),
});

/** Schema for redeem response from backend */
const redeemPromoCodeResponseSchema = z.object({
	redemptionId: z.string(),
	type: promoCodeTypeSchema,
	ticketsGranted: z.number().optional(),
	discountAmount: z.string().optional(),
});

export type RedeemPromoCodePayload = z.infer<
	typeof redeemPromoCodePayloadSchema
>;
export type RedeemPromoCodeResponse = z.infer<
	typeof redeemPromoCodeResponseSchema
>;

/**
 * Redeems a promo code for a specific raffle.
 *
 * For free_tickets type: Issues tickets directly, no orderId needed.
 * For discount types: Requires orderId to apply discount.
 *
 * @param payload - Redeem request data (code, raffleId, optional orderId)
 * @returns ServiceResponse with redemption result or error code
 */
export async function redeemPromoCode(
	payload: RedeemPromoCodePayload,
): Promise<ServiceResponse<RedeemPromoCodeResponse, PromoCodeErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		const validationResult = redeemPromoCodePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}

		// promoCodeStringSchema uppercases the code before sending
		const response = await authenticatedClient.post('/promo-codes/redeem', {
			code: validationResult.data.code,
			raffleId: validationResult.data.raffleId,
			...(validationResult.data.orderId && {
				orderId: validationResult.data.orderId,
			}),
		});

		const data = redeemPromoCodeResponseSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PROMO_CODE_EVENTS.REDEEMED,
				{
					code: validationResult.data.code,
					raffle_id: validationResult.data.raffleId,
					type: data.type,
					tickets_granted: data.ticketsGranted,
					discount_amount: data.discountAmount,
				},
				{ userId },
			);
		});

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'redeem-promo-code');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapPromoCodeError(error);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				PROMO_CODE_EVENTS.REDEEM_FAILED,
				{
					code: payload.code,
					raffle_id: payload.raffleId,
					error_code: errorCode,
				},
				{ userId },
			);
		});

		return failure(errorCode);
	}
}
