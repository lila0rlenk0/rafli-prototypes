'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import type { PromoCodeErrorCode } from '@/types/errors';
import type { ExportPromoCodesQuery } from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Exports promo codes as CSV for a raffle (host only).
 *
 * Returns CSV content as a string — blob download is handled client-side.
 *
 * @param raffleId - The ID of the raffle
 * @param query - Optional filter parameters (include, status, type)
 * @returns ServiceResponse with CSV content on success, PromoCodeErrorCode on failure
 */
export async function exportPromoCodes(
	raffleId: string,
	query?: Partial<ExportPromoCodesQuery>,
): Promise<ServiceResponse<string, PromoCodeErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${raffleId}/promo-codes/export`,
			{
				params: {
					...(query?.bulkId && { bulkId: query.bulkId }),
					include: query?.include ?? 'all',
					status: query?.status ?? 'all',
					type: query?.type ?? 'all',
				},
				responseType: 'text',
			},
		);
		return success(response.data);
	} catch (error) {
		return failure(mapPromoCodeError(error));
	}
}
