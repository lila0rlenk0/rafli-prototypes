'use server';

import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { requireAuth } from '@/lib/auth/session';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
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
	// Defense-in-depth — backend also enforces host ownership
	await requireAuth();

	try {
		const response = await authenticatedClient.get(
			`/raffles/${pathParam(raffleId)}/promo-codes/export`,
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
		// Response is a raw CSV blob (responseType: 'text') — no Zod schema
		// applies. Hosts export promo codes for fulfillment/accounting, so
		// failures must surface in Sentry alongside other promo-code mutations.
		return success(response.data);
	} catch (error) {
		const errorCode = mapPromoCodeError(error);
		captureServiceError(error, errorCode, {
			service: 'promo-code',
			action: 'export-promo-codes',
		});
		return failure(errorCode);
	}
}
