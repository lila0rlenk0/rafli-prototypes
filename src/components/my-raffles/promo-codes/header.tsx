'use client';

import { Download, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

/**
 * Props for PromoCodesHeader.
 */
interface PromoCodesHeaderProps {
	total: number;
	isLoading: boolean;
	isRefreshing: boolean;
	isReadOnly: boolean;
	onRefresh: () => void;
	onOpenExport: () => void;
	onOpenCreate: () => void;
}

/**
 * Builds the "N Codes" / "Codes" header label.
 * Pure — safe to call inline inside the component JSX would also work,
 * but pulling it out keeps the render function flat and easy to scan.
 * @returns header label copy
 */
function getHeaderText(total: number): string {
	if (total === 0) {
		return 'Codes';
	}
	return `${total} Code${total !== 1 ? 's' : ''}`;
}

/**
 * Actions header rendered above the promo codes table.
 * Shows a count + refresh affordance, an Export button (when there is
 * anything to export), and a Create button (unless the raffle is
 * read-only for the current user).
 * @returns header element
 */
export function PromoCodesHeader({
	total,
	isLoading,
	isRefreshing,
	isReadOnly,
	onRefresh,
	onOpenExport,
	onOpenCreate,
}: PromoCodesHeaderProps) {
	return (
		<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
			<div className="flex items-center gap-2">
				<h2 className="text-lg font-semibold">{getHeaderText(total)}</h2>
				{!isLoading ? (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onRefresh}
						disabled={isRefreshing}
						className="text-gray-500"
					>
						<RefreshCw
							className={cn('size-4', isRefreshing && 'animate-spin')}
						/>
					</Button>
				) : null}
			</div>

			<div className="flex items-center gap-2">
				{total > 0 ? (
					<Button
						onClick={onOpenExport}
						className="cursor-pointer gap-1.5 rounded-full border-2 border-black bg-white px-6 font-semibold text-black hover:bg-black hover:text-white"
					>
						<Download className="size-4" />
						Export
					</Button>
				) : null}

				{!isReadOnly ? (
					<Button
						onClick={onOpenCreate}
						className="font-clash-display hover:bg-background cursor-pointer border-2 border-black bg-black px-8 font-semibold hover:text-black"
					>
						<Plus className="size-4" />
						Create Code
					</Button>
				) : null}
			</div>
		</div>
	);
}
