'use client';

import { Button } from '@/components/ui/button';

/**
 * Props for PromoCodesPagination.
 */
interface PromoCodesPaginationProps {
	currentPage: number;
	totalPages: number;
	onPrevious: () => void;
	onNext: () => void;
}

/**
 * Renders Previous / page-indicator / Next controls.
 * The parent decides whether to mount this at all — once the table
 * fits on a single page there is nothing to paginate.
 * @returns pagination element
 */
export function PromoCodesPagination({
	currentPage,
	totalPages,
	onPrevious,
	onNext,
}: PromoCodesPaginationProps) {
	return (
		<div className="mt-6 flex items-center justify-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={onPrevious}
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
				onClick={onNext}
				disabled={currentPage === totalPages}
			>
				Next
			</Button>
		</div>
	);
}
