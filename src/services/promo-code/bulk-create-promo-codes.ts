'use server';

import { ZodError } from 'zod';

import { PROMO_CODE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession, requireAuth } from '@/lib/auth/session';
import { failure, mapPromoCodeError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
	maxRedemptionsPerUser?: number;
	expiresAt?: string;
}

/**
 * Bulk creates promo codes for a raffle (host only).
 *
 * @param raffleId - The ID of the raffle
 * @param payload - The bulk promo code configuration
 * @returns ServiceResponse with created codes on success, PromoCodeErrorCode on failure
 */
export async function bulkCreatePromoCodes(
	raffleId: string,
	payload: BulkCreatePromoCodesPayload,
): Promise<ServiceResponse<BulkCreatePromoCodesResponse, PromoCodeErrorCode>> {
	// Defense-in-depth — backend also enforces host ownership
	await requireAuth();
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Bulk create promo codes on backend
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/promo-codes/bulk`,
			payload,
		);

		// Step 2: Validate response shape
		const data = bulkCreatePromoCodesResponseSchema.parse(response.data);

		// Step 3: Fire-and-forget analytics — promo creation is not latency-sensitive
		void sessionPromise.then(session =>
			trackServer(
				PROMO_CODE_EVENTS.BULK_CREATED,
				{
					raffle_id: raffleId,
					count: payload.count,
					type: payload.type,
					value: payload.value,
					has_expiry: !!payload.expiresAt,
					max_uses: payload.maxUses,
				},
				{ userId: session?.user?.id },
			),
		);

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'promo-code', 'bulk-create-promo-codes');
			return failure(PROMO_CODE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapPromoCodeError(error));
	}
}
