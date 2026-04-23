'use server';

import { ZodError, z } from 'zod';

import { PROMO_CODE_EVENTS } from '@/lib/analytics/events';
import { hashPromoCodeForAnalytics } from '@/lib/analytics/hash-sensitive';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { mapPromoCodeError } from '@/lib/errors/error-mapper';
import { failure, success } from '@/lib/errors/service-result';
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
	raffleId: z.uuidv7(),
	orderId: z.uuidv7().optional(),
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
	// Dynamic import — static `getSession` would load `auth/session` (and bind
	// `fetchMeWithBearerToken`) at module load; unit tests import this file
	// before integration tests can install `fetch-me` mocks.
	const sessionPromise = import('@/lib/auth/session').then(m => m.getSession());

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

		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			PROMO_CODE_EVENTS.REDEEMED,
			{
				code_fingerprint: hashPromoCodeForAnalytics(validationResult.data.code),
				raffle_id: validationResult.data.raffleId,
				type: data.type,
				tickets_granted: data.ticketsGranted,
				discount_amount: data.discountAmount,
			},
			{ userId },
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'redeem-promo-code');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapPromoCodeError(error);

		const userId = (await sessionPromise)?.user?.id;

		await trackAfter(
			PROMO_CODE_EVENTS.REDEEM_FAILED,
			{
				code_fingerprint: hashPromoCodeForAnalytics(payload.code),
				raffle_id: payload.raffleId,
				error_code: errorCode,
			},
			{ userId },
		);

		return failure(errorCode);
	}
}
