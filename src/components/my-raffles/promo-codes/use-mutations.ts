'use client';

import { toast } from 'sonner';

import type { CreatePromoCodePayload } from '@/components/promo-code/create/modal';
import { useBulkCreatePromoCodes } from '@/services/promo-code/use-bulk-create-promo-codes';
import { useDeactivatePromoCode } from '@/services/promo-code/use-deactivate-promo-code';
import type { BulkCreatePromoCodesResponse } from '@/types/promo-code';

/**
 * Wraps bulk-create + deactivate mutations with toast side-effects and
 * promise-based resolution so the calling component can await them.
 * Lives separate from `usePromoCodesContent` to keep that orchestrator
 * under the 60-LOC hook cap.
 * @returns handleCreate + handleDeactivate bound to the raffle
 */
export function usePromoCodeMutations(raffleId: string) {
	const bulkCreate = useBulkCreatePromoCodes();
	const deactivate = useDeactivatePromoCode();

	async function handleCreate(
		createData: CreatePromoCodePayload,
	): Promise<BulkCreatePromoCodesResponse | null> {
		// Wrap in a Promise so the caller can `await` even though the
		// underlying mutate() API is callback-based.
		return new Promise(resolve => {
			bulkCreate.mutate(
				{ raffleId, data: createData },
				{
					onSuccess(result: BulkCreatePromoCodesResponse) {
						const count = result.created;
						toast.success(
							`${count} promo code${count !== 1 ? 's' : ''} created`,
						);
						resolve(result);
					},
					onError() {
						toast.error('Failed to create promo codes');
						resolve(null);
					},
				},
			);
		});
	}

	async function handleDeactivate(codeId: string): Promise<void> {
		return new Promise(resolve => {
			deactivate.mutate(codeId, {
				onSuccess() {
					toast.success('Promo code deactivated');
					resolve();
				},
				onError() {
					toast.error('Failed to deactivate promo code');
					resolve();
				},
			});
		});
	}

	return { handleCreate, handleDeactivate };
}
