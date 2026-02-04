'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import type { PromoCodeErrorCode } from '@/types/errors';
import type { ExportPromoCodesQuery } from '@/types/promo-code';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for exporting promo codes
 * Returns CSV content as string (blob download handled client-side)
 */
type ExportPromoCodesServiceResponse = ServiceResponse<string, PromoCodeErrorCode>;

/**
 * Exports promo codes as CSV for a raffle (host only)
 *
 * @param raffleId - The ID of the raffle
 * @param query - Optional filter parameters (include, status, type)
 * @returns ServiceResponse with CSV content on success, PromoCodeErrorCode on failure
 */
export async function exportPromoCodes(
	raffleId: string,
	query?: Partial<ExportPromoCodesQuery>,
): Promise<ExportPromoCodesServiceResponse> {
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
		console.error('Export promo codes failed:', error);
		return failure(mapPromoCodeError(error));
	}
}
