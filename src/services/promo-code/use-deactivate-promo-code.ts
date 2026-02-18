'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { PromoCodeErrorCode } from '@/types/errors';

import { deactivatePromoCode } from './deactivate-promo-code';

/**
 * Mutation hook for deactivating a promo code
 * Invalidates all promo code queries on success
 * @returns React Query mutation result
 */
export function useDeactivatePromoCode() {
	const queryClient = useQueryClient();

	return useMutation<void, ServiceError<PromoCodeErrorCode>, string>({
		mutationFn: async function deactivate(promoCodeId: string) {
			const result = await deactivatePromoCode(promoCodeId);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess() {
			queryClient.invalidateQueries({ queryKey: ['promo-code'] });
		},
	});
}
