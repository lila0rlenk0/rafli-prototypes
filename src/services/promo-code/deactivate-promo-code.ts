'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { PROMO_CODE_ERROR_CODES, type PromoCodeErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Schema for deactivate promo code response
 */
const deactivatePromoCodeResponseSchema = z.object({
	success: z.literal(true),
});

/**
 * Deactivates a promo code (host only)
 *
 * @param promoCodeId - The ID of the promo code to deactivate
 * @returns ServiceResponse with void on success, PromoCodeErrorCode on failure
 */
export async function deactivatePromoCode(
	promoCodeId: string,
): Promise<ServiceResponse<void, PromoCodeErrorCode>> {
	try {
		const response = await authenticatedClient.delete(
			`/promo-codes/${promoCodeId}`,
		);
		deactivatePromoCodeResponseSchema.parse(response.data);

		return success(undefined);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Deactivate promo code response validation failed:', error);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
