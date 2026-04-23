'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/class-names';
import type { PromoCode } from '@/types/promo-code';

import { DeactivatePromoCodeModal } from '../deactivate-modal';
import { PromoCodesTableMobileCard } from './mobile-card';
import { PromoCodesTableRow } from './row';
import { usePromoCodesTableSelection } from './use-selection';

/**
 * Props for PromoCodesTable
 */
interface PromoCodesTableProps {
	codes: PromoCode[];
	isReadOnly?: boolean;
	onDeactivate?: (codeId: string) => Promise<void>;
	/** Public slug for generating share links */
	publicSlug?: string;
}

/**
 * PromoCodesTable Component
 *
 * Displays promo codes in a table with copy, status, and actions.
 * Responsive: desktop `<table>` above `md`, stacked cards below.
 * Rendering is split into row modules so per-row complexity stays
 * below the lint cap even as the domain grows.
 * @returns table + modal tree, or null when there is nothing to show
 */
export function PromoCodesTable({
	codes,
	isReadOnly = false,
	onDeactivate,
	publicSlug,
}: PromoCodesTableProps) {
	const {
		deactivatingCode,
		isDeactivating,
		setDeactivatingCode,
		clearSelection,
		handleCopyBatchId,
		handleDeactivate,
	} = usePromoCodesTableSelection({ onDeactivate });

	if (codes.length === 0) {
		return null;
	}

	return (
		<>
			{/* Desktop Table — raw <table> (not shadcn Table) preserved per
			    existing markup; the CSS relies on these classes. */}
			<div className="hidden overflow-x-auto md:block">
				<table className="w-full min-w-150">
					<thead>
						<tr className="border-cool-100 border-b text-left text-sm text-gray-500">
							<th className="pb-3 font-medium">Code</th>
							<th className="pb-3 font-medium">Type</th>
							<th className="pb-3 font-medium">Value</th>
							<th className="pb-3 font-medium">Usage</th>
							<th className="pb-3 font-medium">Per User</th>
							<th className="pb-3 font-medium">Status</th>
							<th className="pb-3 font-medium">Expires</th>
							<th className="pb-3 text-right font-medium" />
						</tr>
					</thead>
					<tbody>
						{codes.map(code => (
							<PromoCodesTableRow
								key={code.id}
								code={code}
								isReadOnly={isReadOnly}
								publicSlug={publicSlug}
								onCopyBatchId={handleCopyBatchId}
								onRequestDeactivate={setDeactivatingCode}
							/>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile Cards */}
			<div className="flex flex-col gap-3 md:hidden">
				{codes.map(code => (
					<PromoCodesTableMobileCard
						key={code.id}
						code={code}
						isReadOnly={isReadOnly}
						publicSlug={publicSlug}
						onCopyBatchId={handleCopyBatchId}
						onRequestDeactivate={setDeactivatingCode}
					/>
				))}
			</div>

			{/* Deactivate Modal */}
			<DeactivatePromoCodeModal
				code={deactivatingCode}
				isOpen={!!deactivatingCode}
				isLoading={isDeactivating}
				onClose={clearSelection}
				onConfirm={handleDeactivate}
			/>
		</>
	);
}

/**
 * PromoCodesTableSkeleton Component
 *
 * Loading skeleton for the promo codes table.
 * Displays placeholder rows while data is being fetched.
 * @returns skeleton element tree
 */
export function PromoCodesTableSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className={cn(
						'flex items-center gap-4 rounded-lg border border-gray-200 p-4',
						'md:rounded-none md:border-0 md:border-b md:border-gray-100',
					)}
				>
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-12" />
					<Skeleton className="h-5 w-16" />
				</div>
			))}
		</div>
	);
}
