'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { PromoCodeErrorCode } from '@/types/errors';
import type {
	BulkCreatePromoCodesResponse,
	PromoCodeType,
} from '@/types/promo-code';

import { bulkCreatePromoCodes } from './bulk-create-promo-codes';

/**
 * Payload for the bulk create mutation
 */
interface BulkCreatePayload {
	raffleId: string;
	data: {
		count: number;
		type: PromoCodeType;
		value: number;
		maxUses?: number;
		expiresAt?: string;
	};
}

/**
 * Mutation hook for bulk creating promo codes
 * Invalidates all promo code queries on success
 * @returns React Query mutation result
 */
export function useBulkCreatePromoCodes() {
	const queryClient = useQueryClient();

	return useMutation<
		BulkCreatePromoCodesResponse,
		ServiceError<PromoCodeErrorCode>,
		BulkCreatePayload
	>({
		mutationFn: async function createCodes({
			raffleId,
			data,
		}: BulkCreatePayload) {
			const result = await bulkCreatePromoCodes(raffleId, data);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess() {
			queryClient.invalidateQueries({ queryKey: ['promo-code'] });
		},
	});
}
