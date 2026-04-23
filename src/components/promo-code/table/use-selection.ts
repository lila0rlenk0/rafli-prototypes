'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { PromoCode } from '@/types/promo-code';

/**
 * Arguments for the selection hook.
 */
interface UseTableSelectionArgs {
	onDeactivate?: (codeId: string) => Promise<void>;
}

/**
 * Manages per-row selection state for the deactivate confirmation modal
 * and encapsulates the clipboard side-effects used by row actions.
 * Kept local to the table (not lifted) — the parent does not need to
 * observe which row is mid-deactivation.
 * @returns selection state, setters, and clipboard handlers
 */
export function usePromoCodesTableSelection({
	onDeactivate,
}: UseTableSelectionArgs) {
	const [deactivatingCode, setDeactivatingCode] = useState<PromoCode | null>(
		null,
	);
	const [isDeactivating, setIsDeactivating] = useState(false);

	// Clipboard writes are rejected in non-secure contexts; surface the
	// failure via toast instead of bubbling it up to an error boundary.
	async function handleCopyBatchId(bulkId: string) {
		try {
			await navigator.clipboard.writeText(bulkId);
			toast.success('Batch ID copied');
		} catch {
			toast.error('Failed to copy batch ID');
		}
	}

	async function handleDeactivate() {
		if (!deactivatingCode || !onDeactivate) return;

		setIsDeactivating(true);
		try {
			await onDeactivate(deactivatingCode.id);
		} finally {
			// Always clear the modal selection — even on failure — so the
			// user is not stuck on a stale confirmation screen.
			setIsDeactivating(false);
			setDeactivatingCode(null);
		}
	}

	function clearSelection() {
		setDeactivatingCode(null);
	}

	return {
		deactivatingCode,
		isDeactivating,
		setDeactivatingCode,
		clearSelection,
		handleCopyBatchId,
		handleDeactivate,
	};
}
