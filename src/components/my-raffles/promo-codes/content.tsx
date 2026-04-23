'use client';

import { useState } from 'react';

import { CreatePromoCodeModal } from '@/components/promo-code/create/modal';
import { ExportPromoCodesModal } from '@/components/promo-code/export-modal';
import { PromoCodesEmptyState } from '@/components/promo-code/table/empty-state';
import {
	PromoCodesTable,
	PromoCodesTableSkeleton,
} from '@/components/promo-code/table/table';

import { PromoCodesHeader } from './header';
import { PromoCodesPagination } from './pagination';
import { usePromoCodesContent } from './use-content';

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
 * Client component for the promo codes page content.
 * Wires the header actions, table, pagination, and modals together —
 * all data + mutation plumbing lives in `usePromoCodesContent`.
 * @returns promo codes page shell
 */
export function PromoCodesContent({
	raffleId,
	publicSlug,
	isReadOnly,
	allowFreeTickets,
}: PromoCodesContentProps) {
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);

	const {
		codes,
		total,
		isLoading,
		isRefreshing,
		currentPage,
		totalPages,
		hasMultiplePages,
		handleCreate,
		handleDeactivate,
		handleExport,
		handleExportBatch,
		handleRefresh,
		handlePreviousPage,
		handleNextPage,
	} = usePromoCodesContent({ raffleId });

	function handleOpenCreateModal() {
		setIsCreateModalOpen(true);
	}

	function handleCloseCreateModal() {
		setIsCreateModalOpen(false);
	}

	function handleOpenExportModal() {
		setIsExportModalOpen(true);
	}

	function handleCloseExportModal() {
		setIsExportModalOpen(false);
	}

	const showTable = !isLoading && codes.length > 0;
	const showEmpty = !isLoading && codes.length === 0;
	const showPagination = hasMultiplePages && !isLoading;

	return (
		<div className="rounded-2xl bg-white p-6">
			<PromoCodesHeader
				total={total}
				isLoading={isLoading}
				isRefreshing={isRefreshing}
				isReadOnly={isReadOnly}
				onRefresh={handleRefresh}
				onOpenExport={handleOpenExportModal}
				onOpenCreate={handleOpenCreateModal}
			/>

			{isLoading ? <PromoCodesTableSkeleton /> : null}
			{showEmpty ? <PromoCodesEmptyState isReadOnly={isReadOnly} /> : null}
			{showTable ? (
				<PromoCodesTable
					codes={codes}
					isReadOnly={isReadOnly}
					onDeactivate={handleDeactivate}
					publicSlug={publicSlug}
				/>
			) : null}

			{showPagination ? (
				<PromoCodesPagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPrevious={handlePreviousPage}
					onNext={handleNextPage}
				/>
			) : null}

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
