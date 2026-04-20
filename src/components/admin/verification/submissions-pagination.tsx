'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

/** Number of submissions per page */
const PAGE_SIZE = 20;

interface SubmissionsPaginationProps {
	total: number;
}

/**
 * SubmissionsPagination Component
 *
 * Prev/Next pagination for the admin submissions list.
 * Follows the established pattern from promo-codes-content.tsx.
 * Only renders when there's more than one page of results.
 *
 * @returns Pagination controls or null if single page
 */
export function SubmissionsPagination({ total }: SubmissionsPaginationProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const totalPages = Math.ceil(total / PAGE_SIZE);

	// parseInt with fallback — Number('abc') produces NaN which breaks
	// button disabled checks and writes ?page=NaN to the URL
	const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
	const currentPage = Math.min(
		Math.max(Number.isNaN(rawPage) ? 1 : rawPage, 1),
		totalPages,
	);

	/**
	 * Navigates to a specific page by updating the URL search param.
	 * Preserves existing filter params (status, type).
	 *
	 * The server page re-renders via its Suspense-key strategy — see
	 * `src/app/(admin)/admin/verification/page.tsx`. No `router.refresh()`
	 * needed here; calling it after push races the in-flight navigation
	 * and can fire against the outgoing URL's cache entry instead of the
	 * target one.
	 */
	function goToPage(page: number) {
		const params = new URLSearchParams(searchParams.toString());

		if (page <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(page));
		}

		router.push(`${pathname}?${params.toString()}`);
	}

	function handlePreviousPage() {
		goToPage(currentPage - 1);
	}

	function handleNextPage() {
		goToPage(currentPage + 1);
	}

	// Don't show pagination for single-page results
	if (totalPages <= 1) return null;

	return (
		<div className="mt-6 flex items-center justify-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={handlePreviousPage}
				disabled={currentPage === 1}
			>
				Previous
			</Button>
			<span className="text-muted-foreground px-4 text-sm">
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
	);
}
