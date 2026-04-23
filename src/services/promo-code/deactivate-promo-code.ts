'use server';

import { z, ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { requireAuth } from '@/lib/auth/session';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	PROMO_CODE_ERROR_CODES,
	type PromoCodeErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

const deactivatePromoCodeResponseSchema = z.object({
	success: z.literal(true),
});

/**
 * Deactivates a promo code (host only).
 *
 * @param promoCodeId - The ID of the promo code to deactivate
 * @returns ServiceResponse with void on success, PromoCodeErrorCode on failure
 */
export async function deactivatePromoCode(
	promoCodeId: string,
): Promise<ServiceResponse<void, PromoCodeErrorCode>> {
	// Defense-in-depth — backend also enforces host ownership
	await requireAuth();

	try {
		const response = await authenticatedClient.delete(
			`/promo-codes/${pathParam(promoCodeId)}`,
		);
		deactivatePromoCodeResponseSchema.parse(response.data);
		return success(undefined);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'deactivate-promo-code');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
