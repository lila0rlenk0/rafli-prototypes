'use client';

import { useState } from 'react';

import { usePromoCodes } from '@/services/promo-code/use-promo-codes';

import { usePromoCodeExports } from './use-exports';
import { usePromoCodeMutations } from './use-mutations';

// Page size is fixed — the backend does not accept a client-controlled
// value and changing it requires a coordinated migration.
const PAGE_SIZE = 20;

/**
 * Arguments for the content hook.
 */
interface UsePromoCodesContentArgs {
	raffleId: string;
}

/**
 * Top-level orchestrator hook for the promo codes page shell.
 * Composes pagination state + query + mutations + exports so the
 * parent component can stay render-only.
 * @returns query state, mutation handlers, and pagination helpers
 */
export function usePromoCodesContent({ raffleId }: UsePromoCodesContentArgs) {
	const [offset, setOffset] = useState(0);

	const { data, isLoading, isPlaceholderData, refetch, isRefetching } =
		usePromoCodes(raffleId, { limit: PAGE_SIZE, offset });

	const { handleCreate, handleDeactivate } = usePromoCodeMutations(raffleId);
	const { handleExport, handleExportBatch } = usePromoCodeExports(raffleId);

	const codes = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / PAGE_SIZE);
	const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
	const hasMultiplePages = totalPages > 1;
	// isRefetching is true for both placeholder fills and user-initiated
	// refetches — mask the spinner when a placeholder page is showing.
	const isRefreshing = isRefetching && !isPlaceholderData;

	function goToPage(page: number) {
		setOffset((page - 1) * PAGE_SIZE);
	}

	function handlePreviousPage() {
		goToPage(currentPage - 1);
	}

	function handleNextPage() {
		goToPage(currentPage + 1);
	}

	function handleRefresh() {
		refetch();
	}

	return {
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
	};
}
