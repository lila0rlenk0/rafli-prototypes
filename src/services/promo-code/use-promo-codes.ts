'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { PromoCodeErrorCode } from '@/types/errors';
import type { ListPromoCodesResponse } from '@/types/promo-code';

import { getPromoCodes } from './get-promo-codes';

/** Query key for promo codes list */
export function promoCodesKey(
	raffleId: string,
	params?: { limit?: number; offset?: number },
) {
	return ['promo-code', 'list', raffleId, params] as const;
}

/**
 * Query hook for fetching paginated promo codes
 * @param raffleId - The raffle ID
 * @param params - Pagination parameters
 * @returns React Query result with promo codes data
 */
export function usePromoCodes(
	raffleId: string,
	params: { limit: number; offset: number },
) {
	return useQuery<ListPromoCodesResponse, ServiceError<PromoCodeErrorCode>>({
		queryKey: promoCodesKey(raffleId, params),
		queryFn: async function fetchPromoCodes() {
			const result = await getPromoCodes(raffleId, params);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		placeholderData: keepPreviousData,
	});
}
