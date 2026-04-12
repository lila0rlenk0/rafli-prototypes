'use client';

import { Download, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
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
import { exportPromoCodes } from '@/services/promo-code/export-promo-codes';
import { useBulkCreatePromoCodes } from '@/services/promo-code/use-bulk-create-promo-codes';
import { useDeactivatePromoCode } from '@/services/promo-code/use-deactivate-promo-code';
import { usePromoCodes } from '@/services/promo-code/use-promo-codes';
import type {
	BulkCreatePromoCodesResponse,
	ExportPromoCodesQuery,
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
	const [offset, setOffset] = useState(0);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);

	const { data, isLoading, isPlaceholderData, refetch, isRefetching } =
		usePromoCodes(raffleId, { limit: PAGE_SIZE, offset });

	const bulkCreate = useBulkCreatePromoCodes();
	const deactivate = useDeactivatePromoCode();

	const codes = data?.items ?? [];
	const total = data?.total ?? 0;

	/**
	 * Handles creating promo codes (single or bulk)
	 */
	async function handleCreate(
		createData: CreatePromoCodeData,
	): Promise<BulkCreatePromoCodesResponse | null> {
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

	/**
	 * Handles deactivating a promo code
	 */
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

	/**
	 * Downloads CSV content as a file
	 */
	function downloadCsv(content: string, filename: string) {
		const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		// Anchor.click() works without appending to the DOM in all modern
		// browsers. Avoiding appendChild/removeChild prevents the
		// "removeChild: node is not a child" error when browser extensions
		// (ad blockers, translation tools) mutate the DOM between append
		// and remove.
		const link = Object.assign(document.createElement('a'), {
			href: url,
			download: filename,
		});
		link.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Handles exporting promo codes
	 */
	async function handleExport(query: ExportPromoCodesQuery): Promise<void> {
		const result = await exportPromoCodes(raffleId, query);

		if (!result.success) {
			toast.error('Failed to export promo codes');
			return;
		}

		downloadCsv(result.data, `promo-codes-${raffleId}.csv`);
		toast.success('Export downloaded');
	}

	/**
	 * Handles exporting a specific batch of promo codes
	 */
	async function handleExportBatch(bulkId: string): Promise<void> {
		const result = await exportPromoCodes(raffleId, { bulkId });

		if (!result.success) {
			toast.error('Failed to export batch');
			return;
		}

		downloadCsv(result.data, `promo-codes-batch-${bulkId.slice(0, 8)}.csv`);
		toast.success('Batch exported');
	}

	/**
	 * Navigates to a specific page
	 */
	function goToPage(page: number) {
		setOffset((page - 1) * PAGE_SIZE);
	}

	const totalPages = Math.ceil(total / PAGE_SIZE);
	const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
	const hasMultiplePages = totalPages > 1;
	const isRefreshing = isRefetching && !isPlaceholderData;

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

	function handleRefresh() {
		refetch();
	}

	function handleOpenExportModal() {
		setIsExportModalOpen(true);
	}

	function handleCloseExportModal() {
		setIsExportModalOpen(false);
	}

	function handleOpenCreateModal() {
		setIsCreateModalOpen(true);
	}

	function handleCloseCreateModal() {
		setIsCreateModalOpen(false);
	}

	function handlePreviousPage() {
		goToPage(currentPage - 1);
	}

	function handleNextPage() {
		goToPage(currentPage + 1);
	}

	return (
		<div className="rounded-2xl bg-white p-6">
			{/* Actions Header */}
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-semibold">{getHeaderText()}</h2>
					{!isLoading ? (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleRefresh}
							disabled={isRefreshing}
							className="text-gray-500"
						>
							<RefreshCw className={getRefreshIconClass()} />
						</Button>
					) : null}
				</div>

				<div className="flex items-center gap-2">
					{total > 0 ? (
						<Button
							onClick={handleOpenExportModal}
							className="cursor-pointer gap-1.5 rounded-full border-2 border-black bg-white px-6 font-semibold text-black hover:bg-black hover:text-white"
						>
							<Download className="size-4" />
							Export
						</Button>
					) : null}

					{!isReadOnly ? (
						<Button
							onClick={handleOpenCreateModal}
							className="font-clash-display hover:bg-background cursor-pointer border-2 border-black bg-black px-8 font-semibold hover:text-black"
						>
							<Plus className="size-4" />
							Create Code
						</Button>
					) : null}
				</div>
			</div>

			{/* Content */}
			{isLoading ? <PromoCodesTableSkeleton /> : null}
			{!isLoading && codes.length === 0 ? (
				<PromoCodesEmptyState isReadOnly={isReadOnly} />
			) : null}
			{!isLoading && codes.length > 0 ? (
				<PromoCodesTable
					codes={codes}
					isReadOnly={isReadOnly}
					onDeactivate={handleDeactivate}
					publicSlug={publicSlug}
				/>
			) : null}

			{/* Pagination */}
			{hasMultiplePages && !isLoading ? (
				<div className="mt-6 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handlePreviousPage}
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
						onClick={handleNextPage}
						disabled={currentPage === totalPages}
					>
						Next
					</Button>
				</div>
			) : null}

			{/* Modals */}
			<CreatePromoCodeModal
				isOpen={isCreateModalOpen}
				onClose={handleCloseCreateModal}
				onCreate={handleCreate}
				onExportBatch={handleExportBatch}
				allowFreeTickets={allowFreeTickets}
			/>

			<ExportPromoCodesModal
				isOpen={isExportModalOpen}
				onClose={handleCloseExportModal}
				onExport={handleExport}
			/>
		</div>
	);
}
