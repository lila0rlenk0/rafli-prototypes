'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import {
	PROMO_CODE_ERROR_CODES,
	type PromoCodeErrorCode,
} from '@/types/errors';
import {
	bulkCreatePromoCodesResponseSchema,
	type BulkCreatePromoCodesResponse,
	type PromoCodeType,
} from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Payload for bulk creating promo codes
 */
interface BulkCreatePromoCodesPayload {
	count: number;
	type: PromoCodeType;
	value: number;
	maxUses?: number;
	expiresAt?: string;
}

/**
 * Bulk creates promo codes for a raffle (host only)
 *
 * @param raffleId - The ID of the raffle
 * @param payload - The bulk promo code configuration
 * @returns ServiceResponse with created codes on success, PromoCodeErrorCode on failure
 */
export async function bulkCreatePromoCodes(
	raffleId: string,
	payload: BulkCreatePromoCodesPayload,
): Promise<ServiceResponse<BulkCreatePromoCodesResponse, PromoCodeErrorCode>> {
	try {
		// Step 1: Send create request to backend.
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/promo-codes/bulk`,
			payload,
		);
		// Step 2: Validate response shape.
		const validated = bulkCreatePromoCodesResponseSchema.parse(response.data);

		// Step 3: Return typed success.
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error(
				'Bulk create promo codes response validation failed:',
				error,
			);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
