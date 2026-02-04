'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { PROMO_CODE_ERROR_CODES, type PromoCodeErrorCode } from '@/types/errors';
import { promoCodeSchema, type PromoCode } from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for creating a promo code
 */
type CreatePromoCodeServiceResponse = ServiceResponse<PromoCode, PromoCodeErrorCode>;

/**
 * Payload for creating a promo code
 */
interface CreatePromoCodePayload {
	type: 'free_tickets' | 'discount_fixed' | 'discount_percent';
	value: number;
	maxUses?: number;
	expiresAt?: string;
}

/**
 * Creates a new promo code for a raffle (host only)
 *
 * @param raffleId - The ID of the raffle
 * @param payload - The promo code configuration
 * @returns ServiceResponse with created promo code on success, PromoCodeErrorCode on failure
 */
export async function createPromoCode(
	raffleId: string,
	payload: CreatePromoCodePayload,
): Promise<CreatePromoCodeServiceResponse> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/promo-codes`,
			payload,
		);
		const validated = promoCodeSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Create promo code response validation failed:', error);
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
