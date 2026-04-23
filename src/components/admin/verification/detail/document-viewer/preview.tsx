'use client';

import { FileText } from 'lucide-react';
import Image from 'next/image';

import { isImageType, isPdfType } from '@/lib/utils/media/mime';

interface DocumentPreviewProps {
	url: string;
	contentType: string;
	filename: string;
}

/**
 * Fullscreen preview body for the viewer dialog.
 * - Images render via `next/image` with `object-contain`
 * - PDFs use the browser's built-in viewer via a same-origin `iframe`
 *   (the `#toolbar=1` fragment forces the toolbar to stay visible in
 *   Chrome, Edge, and Firefox)
 * - Anything else falls back to a file-icon card
 *
 * `unoptimized` is required on the image because signed URLs rotate per
 * request, so Next.js caching would 404 quickly.
 */
export function DocumentPreview({
	url,
	contentType,
	filename,
}: DocumentPreviewProps) {
	if (isImageType(contentType)) {
		return (
			<div className="relative h-full w-full">
				<Image
					src={url}
					alt={filename}
					fill
					sizes="90vw"
					className="object-contain"
					unoptimized
				/>
			</div>
		);
	}

	if (isPdfType(contentType)) {
		return (
			<iframe
				src={`${url}#toolbar=1`}
				title={`PDF preview: ${filename}`}
				className="h-full w-full rounded-md bg-white"
			/>
		);
	}

	return (
		<div className="flex flex-col items-center gap-3">
			<FileText className="size-16 text-white/60" />
			<p className="text-sm text-white/80">
				Preview not available for this file type
			</p>
		</div>
	);
}
