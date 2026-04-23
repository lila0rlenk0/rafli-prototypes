'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { DocumentGridCard } from '@/components/admin/verification/detail/document-viewer/grid-card';
import { DocumentPreviewDialog } from '@/components/admin/verification/detail/document-viewer/preview-dialog';
import type { AdminKycDocument } from '@/types/admin-kyc';
import { getDocumentPurposeLabel } from '@/lib/verification/labels';

interface DocumentViewerProps {
	documents: AdminKycDocument[];
}

/**
 * DocumentViewer — admin grid of uploaded KYC documents with a
 * fullscreen preview dialog. Owns navigation state (index + dialog
 * open) and keyboard wiring; rendering delegated to the grid card and
 * preview dialog subcomponents.
 *
 * Keyboard: ArrowLeft/ArrowRight cycles documents; Escape closes (via Dialog).
 *
 * @returns Grid of document cards with a fullscreen preview dialog.
 */
export function DocumentViewer({ documents }: DocumentViewerProps) {
	const [previewOpen, setPreviewOpen] = useState(false);
	// Absolute index into `documents` for the currently previewed doc.
	const [currentIndex, setCurrentIndex] = useState(0);

	// useMemo: precompute which document indices have valid URLs so the
	// previous/next cursors skip over the ones that failed signed-URL
	// generation. Stabilizes downstream useCallback / useEffect deps.
	const previewableIndices = useMemo(
		() => documents.map((doc, i) => (doc.url ? i : -1)).filter(i => i !== -1),
		[documents],
	);

	// Position of the current document within the previewable subset.
	// -1 when the dialog is closed on a non-previewable index, which is
	// safe: navigation guards check `pos > 0` / `pos < length - 1`.
	const currentPosition = previewableIndices.indexOf(currentIndex);
	const hasPrevious = currentPosition > 0;
	const hasNext = currentPosition < previewableIndices.length - 1;

	function handleDocumentClick(index: number) {
		if (!documents[index].url) return;
		setCurrentIndex(index);
		setPreviewOpen(true);
	}

	// useCallback: stable reference for the keyboard effect dep.
	const goToPrevious = useCallback(() => {
		if (currentPosition > 0) {
			setCurrentIndex(previewableIndices[currentPosition - 1]);
		}
	}, [previewableIndices, currentPosition]);

	const goToNext = useCallback(() => {
		if (currentPosition < previewableIndices.length - 1) {
			setCurrentIndex(previewableIndices[currentPosition + 1]);
		}
	}, [previewableIndices, currentPosition]);

	// Keyboard navigation while the dialog is open. Escape is handled by
	// the Dialog primitive itself.
	useEffect(() => {
		if (!previewOpen) return;
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'ArrowLeft') goToPrevious();
			if (event.key === 'ArrowRight') goToNext();
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [previewOpen, goToPrevious, goToNext]);

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
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{documents.map((doc, index) => (
					<DocumentGridCard
						key={doc.id}
						doc={doc}
						index={index}
						onDocumentClick={handleDocumentClick}
					/>
				))}
			</div>

			<DocumentPreviewDialog
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				currentDoc={currentDoc}
				currentPurpose={currentPurpose}
				currentPosition={currentPosition}
				previewableIndices={previewableIndices}
				hasPrevious={hasPrevious}
				hasNext={hasNext}
				onPrevious={goToPrevious}
				onNext={goToNext}
				onDotClick={handleDotClick}
			/>
		</>
	);
}
