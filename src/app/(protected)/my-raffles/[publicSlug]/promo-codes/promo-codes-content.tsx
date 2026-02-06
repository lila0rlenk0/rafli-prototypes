'use client';

import { Download, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
	CreatePromoCodeModal,
	type CreatePromoCodeData,
} from '@/components/promo-code/create-promo-code-modal';
import { ExportPromoCodesModal } from '@/components/promo-code/export-promo-codes-modal';
import { PromoCodesEmptyState } from '@/components/promo-code/promo-codes-empty-state';
import {
	PromoCodesTable,
	PromoCodesTableSkeleton,
} from '@/components/promo-code/promo-codes-table';
import { Button } from '@/components/ui/button';
import { bulkCreatePromoCodes } from '@/services/promo-code/bulk-create-promo-codes';
import { deactivatePromoCode } from '@/services/promo-code/deactivate-promo-code';
import { exportPromoCodes } from '@/services/promo-code/export-promo-codes';
import { getPromoCodes } from '@/services/promo-code/get-promo-codes';
import type {
	BulkCreatePromoCodesResponse,
	ExportPromoCodesQuery,
	PromoCode,
} from '@/types/promo-code';

const PAGE_SIZE = 20;

/**
 * Props for PromoCodesContent
 */
interface PromoCodesContentProps {
	raffleId: string;
	publicSlug: string;
	isReadOnly: boolean;
	allowFreeTickets: boolean;
}

/**
 * Client component for promo codes page content
 * Handles all interactive functionality (CRUD, export, pagination)
 */
export function PromoCodesContent({
	raffleId,
	publicSlug,
	isReadOnly,
	allowFreeTickets,
}: PromoCodesContentProps) {
	const [codes, setCodes] = useState<PromoCode[]>([]);
	const [total, setTotal] = useState(0);
	const [offset, setOffset] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);

	/**
	 * Fetches promo codes with current pagination
	 */
	const fetchCodes = useCallback(
		async (showLoading = true) => {
			// Step 1: Set loading state.
			if (showLoading) setIsLoading(true);
			else setIsRefreshing(true);

			try {
				// Step 2: Fetch codes for current page.
				const result = await getPromoCodes(raffleId, {
					limit: PAGE_SIZE,
					offset,
				});

				if (!result.success) {
					toast.error('Failed to load promo codes');
					return;
				}

				// Step 3: Update list and totals.
				setCodes(result.data.items);
				setTotal(result.data.total);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[raffleId, offset],
	);

	// Initial load and when offset changes
	useEffect(() => {
		fetchCodes();
	}, [fetchCodes]);

	/**
	 * Handles creating promo codes (single or bulk)
	 */
	async function handleCreate(
		data: CreatePromoCodeData,
	): Promise<BulkCreatePromoCodesResponse | null> {
		// Step 1: Send create request.
		const result = await bulkCreatePromoCodes(raffleId, data);

		if (result.success) {
			// Step 2: Notify and refresh list.
			const count = result.data.created;
			toast.success(`${count} promo code${count !== 1 ? 's' : ''} created`);
			// Refresh list to show new codes
			await fetchCodes(false);
			return result.data;
		}

		toast.error('Failed to create promo codes');
		return null;
	}

	/**
	 * Handles deactivating a promo code
	 */
	async function handleDeactivate(codeId: string): Promise<void> {
		// Step 1: Call deactivate endpoint.
		const result = await deactivatePromoCode(codeId);

		if (!result.success) {
			toast.error('Failed to deactivate promo code');
			return;
		}

		// Step 2: Notify and refresh list.
		toast.success('Promo code deactivated');
		// Refresh list to update status
		await fetchCodes(false);
	}

	/**
	 * Downloads CSV content as a file
	 */
	function downloadCsv(content: string, filename: string) {
		const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	/**
	 * Handles exporting promo codes
	 */
	async function handleExport(query: ExportPromoCodesQuery): Promise<void> {
		// Step 1: Request CSV from backend.
		const result = await exportPromoCodes(raffleId, query);

		if (!result.success) {
			toast.error('Failed to export promo codes');
			return;
		}

		// Step 2: Download file and notify.
		downloadCsv(result.data, `promo-codes-${raffleId}.csv`);
		toast.success('Export downloaded');
	}

	/**
	 * Handles exporting a specific batch of promo codes
	 */
	async function handleExportBatch(bulkId: string): Promise<void> {
		// Step 1: Request CSV for batch.
		const result = await exportPromoCodes(raffleId, { bulkId });

		if (!result.success) {
			toast.error('Failed to export batch');
			return;
		}

		// Step 2: Download file and notify.
		downloadCsv(result.data, `promo-codes-batch-${bulkId.slice(0, 8)}.csv`);
		toast.success('Batch exported');
	}

	/**
	 * Calculates total pages
	 */
	function getTotalPages(): number {
		return Math.ceil(total / PAGE_SIZE);
	}

	/**
	 * Gets current page number (1-indexed)
	 */
	function getCurrentPage(): number {
		return Math.floor(offset / PAGE_SIZE) + 1;
	}

	/**
	 * Navigates to a specific page
	 */
	function goToPage(page: number) {
		setOffset((page - 1) * PAGE_SIZE);
	}

	const totalPages = getTotalPages();
	const currentPage = getCurrentPage();
	const hasMultiplePages = totalPages > 1;

	/**
	 * Gets formatted header text showing total codes count
	 */
	function getHeaderText(): string {
		if (total === 0) {
			return 'Codes';
		}
		return `${total} Code${total !== 1 ? 's' : ''}`;
	}

	/**
	 * Gets refresh icon class based on loading state
	 */
	function getRefreshIconClass(): string {
		const base = 'size-4';
		return isRefreshing ? `${base} animate-spin` : base;
	}

	return (
		<div className="rounded-2xl bg-white p-6">
			{/* Actions Header */}
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-semibold">{getHeaderText()}</h2>
					{!isLoading && (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => fetchCodes(false)}
							disabled={isRefreshing}
							className="text-gray-500"
						>
							<RefreshCw className={getRefreshIconClass()} />
						</Button>
					)}
				</div>

				<div className="flex items-center gap-2">
					{total > 0 && (
						<Button
							onClick={() => setIsExportModalOpen(true)}
							className="cursor-pointer gap-1.5 rounded-full border-2 border-black bg-white px-6 font-semibold text-black hover:bg-black hover:text-white"
						>
							<Download className="size-4" />
							Export
						</Button>
					)}

					{!isReadOnly && (
						<Button
							onClick={() => setIsCreateModalOpen(true)}
							className="font-clash-display hover:bg-background cursor-pointer border-2 border-black bg-black px-8 font-semibold hover:text-black"
						>
							<Plus className="size-4" />
							Create Code
						</Button>
					)}
				</div>
			</div>

			{/* Content */}
			{isLoading && <PromoCodesTableSkeleton />}
			{!isLoading && codes.length === 0 && (
				<PromoCodesEmptyState isReadOnly={isReadOnly} />
			)}
			{!isLoading && codes.length > 0 && (
				<PromoCodesTable
					codes={codes}
					isReadOnly={isReadOnly}
					onDeactivate={handleDeactivate}
					publicSlug={publicSlug}
				/>
			)}

			{/* Pagination */}
			{hasMultiplePages && !isLoading && (
				<div className="mt-6 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => goToPage(currentPage - 1)}
						disabled={currentPage === 1}
					>
						Previous
					</Button>

					<span className="px-4 text-sm text-gray-600">
						Page {currentPage} of {totalPages}
					</span>

					<Button
						variant="outline"
						size="sm"
						onClick={() => goToPage(currentPage + 1)}
						disabled={currentPage === totalPages}
					>
						Next
					</Button>
				</div>
			)}

			{/* Modals */}
			<CreatePromoCodeModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				onCreate={handleCreate}
				onExportBatch={handleExportBatch}
				allowFreeTickets={allowFreeTickets}
			/>

			<ExportPromoCodesModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				onExport={handleExport}
			/>
		</div>
	);
}
