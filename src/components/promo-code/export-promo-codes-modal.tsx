'use client';

import { Download, Loader2 } from 'lucide-react';
import { ComponentProps, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { ExportPromoCodesQuery } from '@/types/promo-code';

/**
 * Props for ExportPromoCodesModal
 */
interface ExportPromoCodesModalProps {
	isOpen: boolean;
	onClose: () => void;
	onExport: (query: ExportPromoCodesQuery) => Promise<void>;
}

type IncludeFilter = 'all' | 'redeemed' | 'unredeemed';
type StatusFilter = 'all' | 'active' | 'inactive';
type TypeFilter =
	| 'all'
	| 'free_tickets'
	| 'discount_fixed'
	| 'discount_percent';

// Hoisted to module scope: `z.uuidv7()` allocates a new ZodUUID instance on
// every call, and parsing happens inside the render body below. Creating the
// schema once amortizes the allocation across re-renders (input typing, focus
// changes, sibling state updates) which keeps validation work trivial.
const bulkIdSchema = z.uuidv7();

/**
 * Modal for exporting promo codes with filters
 */
export function ExportPromoCodesModal({
	isOpen,
	onClose,
	onExport,
}: ExportPromoCodesModalProps) {
	const [isExporting, setIsExporting] = useState(false);
	const [include, setInclude] = useState<IncludeFilter>('all');
	const [status, setStatus] = useState<StatusFilter>('all');
	const [type, setType] = useState<TypeFilter>('all');
	const [bulkId, setBulkId] = useState('');

	const trimmedBulkId = bulkId.trim();
	const hasInvalidBulkId =
		trimmedBulkId !== '' && !bulkIdSchema.safeParse(trimmedBulkId).success;

	/**
	 * Handles export action
	 */
	async function handleExport() {
		if (hasInvalidBulkId) return;

		setIsExporting(true);
		try {
			// Step 1: Build query and export.
			await onExport({
				include,
				status,
				type,
				...(trimmedBulkId && { bulkId: trimmedBulkId }),
			});
			// Step 2: Close on success.
			onClose();
		} finally {
			setIsExporting(false);
		}
	}

	/**
	 * Resets filters and closes modal
	 */
	function handleClose() {
		// Step 1: Reset local filters.
		setInclude('all');
		setStatus('all');
		setType('all');
		setBulkId('');
		// Step 2: Close modal.
		onClose();
	}

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
			<DialogContent className="max-w-md overflow-hidden border border-[#0F0F0FF2] p-14">
				<ColoredCards className="absolute right-0 bottom-0 -z-1 rounded-br-xl" />

				<DialogHeader>
					<DialogTitle className="font-clash-display text-3xl font-semibold text-[#182135]">
						Export Promo Codes
					</DialogTitle>
					<DialogDescription>
						Download promo codes as a CSV file.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Bulk ID Filter */}
					<div className="space-y-2">
						<Label htmlFor="bulkId">Batch ID (optional)</Label>
						<Input
							id="bulkId"
							value={bulkId}
							onChange={e => setBulkId(e.target.value)}
							placeholder="e.g. 0192d4f8-7a3b-7def-8c12-abc123def456"
							className={hasInvalidBulkId ? 'border-red-500' : ''}
						/>
						{hasInvalidBulkId ? (
							<p className="text-xs text-red-500">Invalid UUID format</p>
						) : null}
						<p className="text-xs text-gray-500">
							Export only codes from a specific batch
						</p>
					</div>

					{/* Include Filter */}
					<div className="space-y-2">
						<Label>Include</Label>
						<Select
							value={include}
							onValueChange={value => setInclude(value as IncludeFilter)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All codes</SelectItem>
								<SelectItem value="redeemed">Redeemed only</SelectItem>
								<SelectItem value="unredeemed">Unredeemed only</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Status Filter */}
					<div className="space-y-2">
						<Label>Status</Label>
						<Select
							value={status}
							onValueChange={value => setStatus(value as StatusFilter)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="active">Active only</SelectItem>
								<SelectItem value="inactive">Inactive only</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Type Filter */}
					<div className="space-y-2">
						<Label>Type</Label>
						<Select
							value={type}
							onValueChange={value => setType(value as TypeFilter)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All types</SelectItem>
								<SelectItem value="free_tickets">Free Tickets</SelectItem>
								<SelectItem value="discount_fixed">Fixed Discount</SelectItem>
								<SelectItem value="discount_percent">
									Percentage Discount
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter className="sm:justify-center">
					<Button
						onClick={handleExport}
						disabled={isExporting || hasInvalidBulkId}
						className="font-clash-display hover:bg-background mt-2 w-full cursor-pointer border-2 border-black bg-black font-semibold hover:text-black"
					>
						{isExporting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Exporting...
							</>
						) : (
							<>
								<Download className="size-4" />
								Download CSV
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Colored decorative cards SVG for modal background
 */
function ColoredCards(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="393"
			height="234"
			viewBox="0 0 393 234"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M412.192 347.187C408.762 359.99 395.601 367.588 382.798 364.157L225.402 321.983C212.599 318.553 205.001 305.393 208.432 292.59L250.606 135.194C254.036 122.39 267.196 114.792 280 118.223L437.396 160.397C450.199 163.828 457.797 176.988 454.366 189.791L412.192 347.187Z"
				fill="#C4EDFF"
			/>
			<path
				d="M500.086 219.272C494.38 231.235 480.056 236.308 468.092 230.601L342.882 170.878C330.918 165.171 325.846 150.847 331.552 138.883L391.276 13.6734C396.982 1.70985 411.306 -3.36259 423.27 2.34386L548.48 62.0671C560.444 67.7736 565.516 82.098 559.81 94.0616L500.086 219.272Z"
				fill="#BEFFDB"
			/>
			<path
				d="M267.381 283.914C274.008 295.393 270.075 310.071 258.596 316.698L117.479 398.172C106 404.8 91.3217 400.867 84.6943 389.388L3.2201 248.27C-3.40731 236.791 0.52568 222.113 12.0047 215.486L153.122 134.012C164.601 127.384 179.279 131.317 185.907 142.796L267.381 283.914Z"
				fill="#F6FF8B"
			/>
		</svg>
	);
}
