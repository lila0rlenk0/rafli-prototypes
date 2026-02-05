'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import {
	PROMO_CODE_ERROR_CODES,
	type PromoCodeErrorCode,
} from '@/types/errors';
import {
	listPromoCodesResponseSchema,
	type ListPromoCodesResponse,
} from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for getting promo codes
 */
type GetPromoCodesServiceResponse = ServiceResponse<
	ListPromoCodesResponse,
	PromoCodeErrorCode
>;

/**
 * Pagination parameters for fetching promo codes
 */
interface GetPromoCodesParams {
	limit?: number;
	offset?: number;
}

/**
 * Fetches promo codes for a raffle (host only)
 *
 * @param raffleId - The ID of the raffle
 * @param params - Optional pagination parameters (limit, offset)
 * @returns ServiceResponse with promo codes list on success, PromoCodeErrorCode on failure
 */
export async function getPromoCodes(
	raffleId: string,
	params?: GetPromoCodesParams,
): Promise<GetPromoCodesServiceResponse> {
	try {
		// Step 1: Request promo codes list.
		const response = await authenticatedClient.get(
			`/raffles/${raffleId}/promo-codes`,
			{
				params: {
					limit: params?.limit,
					offset: params?.offset,
				},
			},
		);
		// Step 2: Validate response shape.
		const validated = listPromoCodesResponseSchema.parse(response.data);

		// Step 3: Return typed success.
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Promo codes response validation failed:', error);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
