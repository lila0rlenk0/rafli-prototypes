'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import {
	PROMO_CODE_ERROR_CODES,
	type PromoCodeErrorCode,
} from '@/types/errors';
import {
	PROMO_CODE_REGEX,
	type ValidatePromoCodeResponse,
	validatePromoCodeResponseSchema,
} from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Validates a promo code for a specific raffle
 *
 * @param raffleId - The raffle ID to validate the code for
 * @param code - The promo code string to validate
 * @returns ServiceResponse with validation result or error code
 */
export async function validatePromoCode(
	raffleId: string,
	code: string,
): Promise<ServiceResponse<ValidatePromoCodeResponse, PromoCodeErrorCode>> {
	try {
		const normalizedCode = code.trim().toUpperCase();

		// Step 1: Early format validation.
		if (!PROMO_CODE_REGEX.test(normalizedCode)) {
			return failure(PROMO_CODE_ERROR_CODES.INVALID_CODE);
		}

		// Step 2: Send validation request.
		const response = await authenticatedClient.post('/promo-codes/validate', {
			raffleId,
			code: normalizedCode,
		});

		// Step 3: Validate response and return success.
		const validated = validatePromoCodeResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Promo code validation response parse error:', error);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
