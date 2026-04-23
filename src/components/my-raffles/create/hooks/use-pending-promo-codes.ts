'use client';

import { useCallback, useState } from 'react';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';

interface PendingPromoCodesState {
	pendingPromoCodes: CreatePromoCodePayload[];
	addPendingPromoCode: (data: CreatePromoCodePayload) => void;
	removePendingPromoCode: (index: number) => void;
	clearPendingPromoCodes: () => void;
}

/**
 * Mini store for promo code batches queued up during raffle creation —
 * actual persistence happens after the raffle record is created. Kept
 * in a dedicated hook so the provider body stays focused on the
 * top-level orchestration.
 *
 * @returns List + add/remove/clear mutators.
 */
export function usePendingPromoCodes(): PendingPromoCodesState {
	const [pendingPromoCodes, setPendingPromoCodes] = useState<
		CreatePromoCodePayload[]
	>([]);

	const addPendingPromoCode = useCallback((data: CreatePromoCodePayload) => {
		setPendingPromoCodes(prev => [...prev, data]);
	}, []);

	const removePendingPromoCode = useCallback((index: number) => {
		setPendingPromoCodes(prev => prev.filter((_, i) => i !== index));
	}, []);

	const clearPendingPromoCodes = useCallback(() => {
		setPendingPromoCodes([]);
	}, []);

	return {
		pendingPromoCodes,
		addPendingPromoCode,
		removePendingPromoCode,
		clearPendingPromoCodes,
	};
}
