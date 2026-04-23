'use client';

import { FileText } from 'lucide-react';
import Image from 'next/image';

import {
	getPdfPreviewUrl,
	isImageType,
	isPdfType,
} from '@/lib/utils/media/mime';
import type { AdminKycDocument } from '@/types/admin-kyc';

interface DocumentThumbnailProps {
	doc: AdminKycDocument;
}

/**
 * Thumbnail renderer for the grid cards.
 *
 * - Images use Next.js Image for responsive previews
 * - PDFs render as non-interactive iframe snapshots of page 1
 * - Unknown types fall back to a file icon
 *
 * The parent card owns click handling; this component is intentionally
 * pure presentation so `tabIndex={-1}` + `aria-hidden="true"` on the
 * iframe keep keyboard focus on the overlay button.
 */
export function DocumentThumbnail({ doc }: DocumentThumbnailProps) {
	if (isImageType(doc.contentType) && doc.url) {
		return (
			<Image
				src={doc.url}
				alt={doc.originalFilename}
				fill
				sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
				className="object-cover"
				// Signed URLs change per request — skip optimization cache.
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
				// Prevent iframe from hijacking click/scroll — the button
				// overlay owns interaction.
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
