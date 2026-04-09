'use server';

import { ZodError } from 'zod';

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
import {
	PROMO_CODE_REGEX,
	type ValidatePromoCodeResponse,
	validatePromoCodeResponseSchema,
} from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Validates a promo code for a specific raffle.
 *
 * Normalizes (trim + uppercase) before the regex check to avoid
 * rejecting codes with accidental whitespace or lowercase input.
 *
 * @param raffleId - The raffle ID to validate the code for
 * @param code - The promo code string to validate
 * @returns ServiceResponse with validation result or error code
 */
export async function validatePromoCode(
	raffleId: string,
	code: string,
): Promise<ServiceResponse<ValidatePromoCodeResponse, PromoCodeErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		const normalizedCode = code.trim().toUpperCase();

		// Early format check — avoids a round trip for malformed codes
		if (!PROMO_CODE_REGEX.test(normalizedCode)) {
			return failure(PROMO_CODE_ERROR_CODES.INVALID_CODE);
		}

		const response = await authenticatedClient.post('/promo-codes/validate', {
			raffleId,
			code: normalizedCode,
		});

		const data = validatePromoCodeResponseSchema.parse(response.data);

		// Fire-and-forget — validation is a read-like operation, don't block
		void sessionPromise.then(session =>
			trackServer(
				PROMO_CODE_EVENTS.VALIDATED,
				{
					code: normalizedCode,
					raffle_id: raffleId,
					valid: data.valid,
				},
				{ userId: session?.user?.id },
			),
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'validate-promo-code');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
