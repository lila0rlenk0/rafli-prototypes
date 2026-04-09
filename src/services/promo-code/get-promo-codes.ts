'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	PROMO_CODE_ERROR_CODES,
	type PromoCodeErrorCode,
} from '@/types/errors';
import {
	listPromoCodesResponseSchema,
	type ListPromoCodesResponse,
} from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/** Pagination parameters for fetching promo codes */
interface GetPromoCodesParams {
	limit?: number;
	offset?: number;
}

/**
 * Fetches promo codes for a raffle (host only).
 *
 * @param raffleId - The ID of the raffle
 * @param params - Optional pagination parameters (limit, offset)
 * @returns ServiceResponse with promo codes list on success, PromoCodeErrorCode on failure
 */
export async function getPromoCodes(
	raffleId: string,
	params?: GetPromoCodesParams,
): Promise<ServiceResponse<ListPromoCodesResponse, PromoCodeErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${raffleId}/promo-codes`,
			{ params },
		);
		return success(listPromoCodesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'get-promo-codes');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
