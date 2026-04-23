'use client';

import { DocumentThumbnail } from '@/components/admin/verification/detail/document-viewer/thumbnail';
import { cn } from '@/lib/class-names';
import type { AdminKycDocument } from '@/types/admin-kyc';
import { getDocumentPurposeLabel } from '@/lib/verification/labels';

interface DocumentGridCardProps {
	doc: AdminKycDocument;
	index: number;
	onDocumentClick: (index: number) => void;
}

/**
 * Single tile in the admin document grid. Keeps the overlay button +
 * metadata label layout in one place so the parent loop stays focused
 * on iteration.
 */
export function DocumentGridCard({
	doc,
	index,
	onDocumentClick,
}: DocumentGridCardProps) {
	const hasUrl = Boolean(doc.url);
	const purposeLabel = getDocumentPurposeLabel(doc.purpose);

	return (
		<div className="border-border flex flex-col overflow-hidden rounded-lg border">
			<div
				className={cn(
					'bg-muted aspect-card relative w-full overflow-hidden transition-opacity',
					hasUrl && 'hover:opacity-80',
					!hasUrl && 'opacity-60',
				)}
			>
				<DocumentThumbnail doc={doc} />
				{hasUrl ? (
					<button
						type="button"
						onClick={() => onDocumentClick(index)}
						className="absolute inset-0 z-10 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
						aria-label={`Preview ${purposeLabel}`}
					/>
				) : (
					<div
						className="absolute inset-0 z-10 cursor-not-allowed"
						aria-hidden="true"
					/>
				)}
			</div>

			<div className="flex flex-col gap-1 p-3">
				<span className="text-sm font-medium">{purposeLabel}</span>
				<span className="text-muted-foreground truncate text-xs">
					{doc.originalFilename}
				</span>
			</div>
		</div>
	);
}
