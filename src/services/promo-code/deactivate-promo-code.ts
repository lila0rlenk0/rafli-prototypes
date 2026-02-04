'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import type { PromoCodeErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for deactivating a promo code
 */
type DeactivatePromoCodeServiceResponse = ServiceResponse<
	{ success: boolean },
	PromoCodeErrorCode
>;

/**
 * Deactivates a promo code (host only)
 *
 * @param promoCodeId - The ID of the promo code to deactivate
 * @returns ServiceResponse with success status on success, PromoCodeErrorCode on failure
 */
export async function deactivatePromoCode(
	promoCodeId: string,
): Promise<DeactivatePromoCodeServiceResponse> {
	try {
		const response = await authenticatedClient.delete(
			`/promo-codes/${promoCodeId}`,
		);

		return success({ success: response.data?.success ?? true });
	} catch (error) {
		return failure(mapPromoCodeError(error));
	}
}
