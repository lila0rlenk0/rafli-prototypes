'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
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
		trimmedBulkId !== '' && !z.string().uuid().safeParse(trimmedBulkId).success;

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
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Export Promo Codes</DialogTitle>
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
						{hasInvalidBulkId && (
							<p className="text-xs text-red-500">Invalid UUID format</p>
						)}
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

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						onClick={handleClose}
						disabled={isExporting}
					>
						Cancel
					</Button>
					<Button
						onClick={handleExport}
						disabled={isExporting || hasInvalidBulkId}
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
