'use client';

import { toast } from 'sonner';

import { exportPromoCodes } from '@/services/promo-code/export-promo-codes';
import type { ExportPromoCodesQuery } from '@/types/promo-code';

/**
 * Triggers a browser download for the given CSV payload.
 * Avoids appendChild/removeChild — anchor.click() works on all modern
 * browsers without DOM attachment, and skipping insertion prevents the
 * "removeChild: node is not a child" error when browser extensions
 * (ad blockers, translation tools) mutate the DOM between append and
 * remove.
 */
function downloadCsv(content: string, filename: string) {
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = Object.assign(document.createElement('a'), {
		href: url,
		download: filename,
	});
	link.click();
	URL.revokeObjectURL(url);
}

/**
 * Exposes export handlers bound to a specific raffle.
 * Returned as plain async functions (not wrapped in useCallback) —
 * the consuming buttons do not memoize and the closure cost is
 * negligible compared to the mutation / network path.
 * @returns handleExport + handleExportBatch
 */
export function usePromoCodeExports(raffleId: string) {
	async function handleExport(query: ExportPromoCodesQuery): Promise<void> {
		const result = await exportPromoCodes(raffleId, query);

		if (!result.success) {
			toast.error('Failed to export promo codes');
			return;
		}

		downloadCsv(result.data, `promo-codes-${raffleId}.csv`);
		toast.success('Export downloaded');
	}

	async function handleExportBatch(bulkId: string): Promise<void> {
		const result = await exportPromoCodes(raffleId, { bulkId });

		if (!result.success) {
			toast.error('Failed to export batch');
			return;
		}

		// 8-char suffix disambiguates concurrent batch exports in the
		// Downloads folder without leaking the full bulk ID.
		downloadCsv(result.data, `promo-codes-batch-${bulkId.slice(0, 8)}.csv`);
		toast.success('Batch exported');
	}

	return { handleExport, handleExportBatch };
}
