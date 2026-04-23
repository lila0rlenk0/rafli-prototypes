'use client';

import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

import { DocumentPreview } from '@/components/admin/verification/detail/document-viewer/preview';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/class-names';
import type { AdminKycDocument } from '@/types/admin-kyc';

interface DocumentPreviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentDoc: AdminKycDocument | undefined;
	currentPurpose: string;
	currentPosition: number;
	previewableIndices: number[];
	hasPrevious: boolean;
	hasNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
	onDotClick: (docIndex: number) => void;
}

/**
 * Fullscreen preview shell — top-right download/close, bottom label,
 * previous/next chevrons, and dot indicators. Body rendering is
 * delegated to `DocumentPreview` so image and PDF variants stay
 * self-contained.
 */
export function DocumentPreviewDialog({
	open,
	onOpenChange,
	currentDoc,
	currentPurpose,
	currentPosition,
	previewableIndices,
	hasPrevious,
	hasNext,
	onPrevious,
	onNext,
	onDotClick,
}: DocumentPreviewDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="h-full-modal max-w-full-screen-md flex flex-col items-center justify-center border-none bg-black/95 p-0"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">{currentPurpose} Preview</DialogTitle>
				<DialogDescription className="sr-only">
					Viewing document {currentPosition + 1} of {previewableIndices.length}
				</DialogDescription>

				<div className="absolute top-4 right-4 z-10 flex items-center gap-2">
					{currentDoc?.url ? (
						<a
							href={currentDoc.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
							aria-label={`Download ${currentPurpose}`}
						>
							<Download className="size-5 text-white" />
						</a>
					) : null}
					<DialogClose className="flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
						<X className="size-5 text-white" />
						<span className="sr-only">Close</span>
					</DialogClose>
				</div>

				<div className="absolute bottom-4 left-4 z-10 rounded-md bg-black/60 px-3 py-1.5">
					<p className="text-xs font-medium text-white">{currentPurpose}</p>
					<p className="text-xs text-white/70">
						{currentDoc?.originalFilename}
					</p>
				</div>

				<div className="relative flex h-full w-full items-center justify-center p-8">
					{hasPrevious ? (
						<button
							type="button"
							onClick={onPrevious}
							className="absolute left-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
							aria-label="Previous document"
						>
							<ChevronLeft className="size-6 text-white" />
						</button>
					) : null}

					{currentDoc?.url ? (
						<DocumentPreview
							url={currentDoc.url}
							contentType={currentDoc.contentType}
							filename={currentDoc.originalFilename}
						/>
					) : null}

					{hasNext ? (
						<button
							type="button"
							onClick={onNext}
							className="absolute right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
							aria-label="Next document"
						>
							<ChevronRight className="size-6 text-white" />
						</button>
					) : null}
				</div>

				{previewableIndices.length > 1 ? (
					<div className="absolute bottom-4 flex gap-2">
						{previewableIndices.map(function renderDot(docIndex, dotIndex) {
							const isActive = currentPosition === dotIndex;
							return (
								<button
									key={docIndex}
									type="button"
									onClick={() => onDotClick(docIndex)}
									className={cn(
										'size-2 rounded-full transition-colors',
										isActive ? 'bg-white' : 'bg-white/40 hover:bg-white/60',
									)}
									aria-label={`Go to document ${dotIndex + 1}`}
								/>
							);
						})}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
