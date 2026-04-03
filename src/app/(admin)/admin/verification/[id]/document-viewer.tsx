'use client';

import { FileText } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { ImageLightbox } from '@/components/ui/image-lightbox';
import { isImageType } from '@/lib/utils/mime';
import type { AdminKycDocument } from '@/types/admin-kyc';
import { getDocumentPurposeLabel } from '@/types/kyc-submission';

interface DocumentViewerProps {
	documents: AdminKycDocument[];
}

/**
 * DocumentViewer Component
 *
 * Grid of document thumbnails with lightbox for image documents.
 * PDFs show a file icon with download link instead.
 * Reuses the existing ImageLightbox component for image viewing.
 *
 * @returns Grid of document cards with lightbox modal
 */
export function DocumentViewer({ documents }: DocumentViewerProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);

	// Filter to image-only URLs for the lightbox — PDFs are excluded so the
	// lightbox doesn't navigate to null entries. Includes an index map so
	// clicking an image at document index N resolves to the correct lightbox index.
	const { imageUrls, docIndexToImageIndex } = useMemo(() => {
		const urls: (string | null)[] = [];
		const indexMap = new Map<number, number>();

		documents.forEach(function mapDocToUrl(doc, docIndex) {
			if (isImageType(doc.contentType) && doc.url) {
				indexMap.set(docIndex, urls.length);
				urls.push(doc.url);
			}
		});

		return { imageUrls: urls, docIndexToImageIndex: indexMap };
	}, [documents]);

	/**
	 * Opens the lightbox at the correct image-only index.
	 * Only works for image documents — PDFs use download links.
	 */
	function handleImageClick(docIndex: number) {
		const imageIndex = docIndexToImageIndex.get(docIndex);
		if (imageIndex === undefined) return;
		setCurrentIndex(imageIndex);
		setLightboxOpen(true);
	}

	if (documents.length === 0) {
		return (
			<p className="text-muted-foreground py-4 text-center text-sm">
				No documents uploaded.
			</p>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{documents.map(function renderDocument(doc, index) {
					const imageUrl = isImageType(doc.contentType) ? doc.url : null;

					return (
						<div
							key={doc.id}
							className="border-border flex flex-col overflow-hidden rounded-lg border"
						>
							{/* Thumbnail or file icon */}
							{imageUrl ? (
								<button
									type="button"
									onClick={() => handleImageClick(index)}
									className="bg-muted relative aspect-[4/3] w-full cursor-pointer overflow-hidden transition-opacity hover:opacity-80"
									aria-label={`View ${getDocumentPurposeLabel(doc.purpose)}`}
								>
									<Image
										src={imageUrl}
										alt={doc.originalFilename}
										fill
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
										className="object-cover"
										// Signed URLs change on every request — skip optimization
										unoptimized
									/>
								</button>
							) : (
								<div className="bg-muted flex aspect-[4/3] w-full items-center justify-center">
									<FileText className="text-muted-foreground size-12" />
								</div>
							)}

							{/* Document info */}
							<div className="flex flex-col gap-1 p-3">
								<span className="text-sm font-medium">
									{getDocumentPurposeLabel(doc.purpose)}
								</span>
								<span className="text-muted-foreground truncate text-xs">
									{doc.originalFilename}
								</span>
								{/* Download link for non-image documents (PDFs) */}
								{!imageUrl && doc.url && (
									<a
										href={doc.url}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-1 text-xs font-medium underline underline-offset-4"
									>
										Download
									</a>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Lightbox for image documents — reuses existing ImageLightbox */}
			<ImageLightbox
				images={imageUrls}
				currentIndex={currentIndex}
				open={lightboxOpen}
				onOpenChange={setLightboxOpen}
				onNavigate={setCurrentIndex}
			/>
		</>
	);
}
