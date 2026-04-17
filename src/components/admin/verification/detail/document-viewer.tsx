'use client';

import { ChevronLeft, ChevronRight, Download, FileText, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getPdfPreviewUrl, isImageType, isPdfType } from '@/lib/utils/mime';
import type { AdminKycDocument } from '@/types/admin-kyc';
import { getDocumentPurposeLabel } from '@/types/kyc-submission';

interface DocumentViewerProps {
	documents: AdminKycDocument[];
}

/**
 * DocumentViewer Component
 *
 * Grid of document thumbnails with inline preview for all file types.
 * Images render via Next.js Image in a fullscreen dialog.
 * PDFs render in a native browser iframe — no download required.
 * Keyboard navigation (ArrowLeft/ArrowRight/Escape) supported.
 *
 * @returns Grid of document cards with preview dialog
 */
export function DocumentViewer({ documents }: DocumentViewerProps) {
	// Controls whether the fullscreen preview dialog is open
	const [previewOpen, setPreviewOpen] = useState(false);
	// Index into the documents array for the currently previewed document
	const [currentIndex, setCurrentIndex] = useState(0);

	// useMemo: precompute which document indices have valid URLs for preview.
	// Avoids re-filtering on every render — also stabilizes downstream deps
	// in useCallback/useEffect (goToPrevious, goToNext, keyboard handler).
	const previewableIndices = useMemo(
		() => documents.map((doc, i) => (doc.url ? i : -1)).filter(i => i !== -1),
		[documents],
	);

	// Position of the currently previewed document within the previewable set.
	// -1 when dialog is closed and currentIndex points to a non-previewable doc
	// (safe — navigation guards check pos > 0 / pos < length - 1).
	const currentPosition = previewableIndices.indexOf(currentIndex);

	const hasPrevious = currentPosition > 0;
	const hasNext = currentPosition < previewableIndices.length - 1;

	/**
	 * Opens the preview dialog for a given document index.
	 * No-op if the document has no URL (signed URL generation failed).
	 */
	function handleDocumentClick(index: number) {
		if (!documents[index].url) return;
		setCurrentIndex(index);
		setPreviewOpen(true);
	}

	// useCallback: stable reference for keyboard event handler effect dep.
	// Without memoization, the effect would re-subscribe on every render.
	/** Navigate to the previous previewable document */
	const goToPrevious = useCallback(() => {
		if (currentPosition > 0) {
			setCurrentIndex(previewableIndices[currentPosition - 1]);
		}
	}, [previewableIndices, currentPosition]);

	// useCallback: same rationale as goToPrevious — keyboard effect dep stability
	/** Navigate to the next previewable document */
	const goToNext = useCallback(() => {
		if (currentPosition < previewableIndices.length - 1) {
			setCurrentIndex(previewableIndices[currentPosition + 1]);
		}
	}, [previewableIndices, currentPosition]);

	// Keyboard navigation — arrows cycle through documents, Escape handled by Dialog
	useEffect(() => {
		if (!previewOpen) return;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'ArrowLeft') goToPrevious();
			if (event.key === 'ArrowRight') goToNext();
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [previewOpen, goToPrevious, goToNext]);

	/** Navigates to a specific document index for the dot indicators */
	function handleDotClick(docIndex: number) {
		setCurrentIndex(docIndex);
	}

	if (documents.length === 0) {
		return (
			<p className="text-muted-foreground py-4 text-center text-sm">
				No documents uploaded.
			</p>
		);
	}

	const currentDoc = documents[currentIndex];
	const currentPurpose = currentDoc
		? getDocumentPurposeLabel(currentDoc.purpose)
		: '';

	return (
		<>
			{/* Thumbnail grid — all documents are clickable for preview */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{documents.map(function renderDocument(doc, index) {
					const hasUrl = Boolean(doc.url);

					return (
						<div
							key={doc.id}
							className="border-border flex flex-col overflow-hidden rounded-lg border"
						>
							{/* Thumbnail preview with a separate interaction overlay */}
							<div
								className={cn(
									'bg-muted relative aspect-[4/3] w-full overflow-hidden transition-opacity',
									hasUrl && 'hover:opacity-80',
									!hasUrl && 'opacity-60',
								)}
							>
								<DocumentThumbnail doc={doc} />

								{hasUrl ? (
									<button
										type="button"
										onClick={() => handleDocumentClick(index)}
										className="absolute inset-0 z-10 cursor-pointer focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
										aria-label={`Preview ${getDocumentPurposeLabel(doc.purpose)}`}
									/>
								) : (
									<div
										className="absolute inset-0 z-10 cursor-not-allowed"
										aria-hidden="true"
									/>
								)}
							</div>

							{/* Document info */}
							<div className="flex flex-col gap-1 p-3">
								<span className="text-sm font-medium">
									{getDocumentPurposeLabel(doc.purpose)}
								</span>
								<span className="text-muted-foreground truncate text-xs">
									{doc.originalFilename}
								</span>
							</div>
						</div>
					);
				})}
			</div>

			{/* Fullscreen preview dialog — renders images or PDFs inline */}
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent
					className="flex h-[90vh] max-w-[90vw] flex-col items-center justify-center border-none bg-black/95 p-0"
					showCloseButton={false}
				>
					<DialogTitle className="sr-only">
						{currentPurpose} Preview
					</DialogTitle>
					<DialogDescription className="sr-only">
						Viewing document {currentPosition + 1} of{' '}
						{previewableIndices.length}
					</DialogDescription>

					{/* Top-right controls: download + close */}
					<div className="absolute top-4 right-4 z-10 flex items-center gap-2">
						{/* Download button — opens the signed URL in a new tab */}
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

					{/* Document label — bottom-left for context */}
					<div className="absolute bottom-4 left-4 z-10 rounded-md bg-black/60 px-3 py-1.5">
						<p className="text-xs font-medium text-white">{currentPurpose}</p>
						<p className="text-xs text-white/70">
							{currentDoc?.originalFilename}
						</p>
					</div>

					{/* Main preview area */}
					<div className="relative flex h-full w-full items-center justify-center p-8">
						{/* Previous button */}
						{hasPrevious ? (
							<button
								type="button"
								onClick={goToPrevious}
								className="absolute left-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
								aria-label="Previous document"
							>
								<ChevronLeft className="size-6 text-white" />
							</button>
						) : null}

						{/* Render based on content type */}
						{currentDoc?.url ? (
							<DocumentPreview
								url={currentDoc.url}
								contentType={currentDoc.contentType}
								filename={currentDoc.originalFilename}
							/>
						) : null}

						{/* Next button */}
						{hasNext ? (
							<button
								type="button"
								onClick={goToNext}
								className="absolute right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
								aria-label="Next document"
							>
								<ChevronRight className="size-6 text-white" />
							</button>
						) : null}
					</div>

					{/* Dot indicators */}
					{previewableIndices.length > 1 ? (
						<div className="absolute bottom-4 flex gap-2">
							{previewableIndices.map(function renderDot(docIndex, dotIndex) {
								const isActive = currentPosition === dotIndex;
								return (
									<button
										key={docIndex}
										type="button"
										onClick={() => handleDotClick(docIndex)}
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
		</>
	);
}

// ─── Internal Preview Renderer ──────────────────────────────────────────────

interface DocumentPreviewProps {
	url: string;
	contentType: string;
	filename: string;
}

interface DocumentThumbnailProps {
	doc: AdminKycDocument;
}

/**
 * Thumbnail preview renderer for document cards.
 *
 * - Images use Next.js Image for fast, responsive previews
 * - PDFs use a non-interactive iframe snapshot of the first page
 * - Unknown types fall back to a file icon
 *
 * @returns Visual thumbnail for the document card
 */
function DocumentThumbnail({ doc }: DocumentThumbnailProps) {
	if (isImageType(doc.contentType) && doc.url) {
		return (
			<Image
				src={doc.url}
				alt={doc.originalFilename}
				fill
				sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
				className="object-cover"
				// Signed URLs change per request — skip optimization cache
				unoptimized
			/>
		);
	}

	if (isPdfType(doc.contentType) && doc.url) {
		return (
			<iframe
				src={getPdfPreviewUrl(doc.url)}
				title={`PDF thumbnail: ${doc.originalFilename}`}
				className="size-full border-0 bg-white"
				// Prevent iframe from hijacking click/scroll — the button overlay owns interaction
				aria-hidden="true"
				tabIndex={-1}
			/>
		);
	}

	return (
		<div className="flex size-full items-center justify-center">
			<FileText className="text-muted-foreground size-12" />
		</div>
	);
}

/**
 * Renders the correct preview element based on content type.
 * - Images → Next.js Image with object-contain (same as ImageLightbox)
 * - PDFs → native browser iframe viewer (no download, no plugins needed)
 *
 * All modern browsers ship a built-in PDF renderer that works inside iframes.
 * The iframe src points to the signed URL — the browser handles rendering.
 */
function DocumentPreview({ url, contentType, filename }: DocumentPreviewProps) {
	if (isImageType(contentType)) {
		return (
			<div className="relative h-full w-full">
				<Image
					src={url}
					alt={filename}
					fill
					sizes="90vw"
					className="object-contain"
					// Signed URLs change per request — skip Next.js image cache
					unoptimized
				/>
			</div>
		);
	}

	if (isPdfType(contentType)) {
		return (
			// iframe fills the preview area — browser's native PDF viewer renders
			// zoom, page navigation, and search controls. #toolbar=1 ensures the
			// browser's PDF toolbar is visible (Chrome, Edge, Firefox).
			<iframe
				src={`${url}#toolbar=1`}
				title={`PDF preview: ${filename}`}
				className="h-full w-full rounded-md bg-white"
			/>
		);
	}

	// Fallback for unknown types — shouldn't happen given ACCEPTED_DOC_TYPES,
	// but handles future-proofing gracefully
	return (
		<div className="flex flex-col items-center gap-3">
			<FileText className="size-16 text-white/60" />
			<p className="text-sm text-white/80">
				Preview not available for this file type
			</p>
		</div>
	);
}
