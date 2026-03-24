'use client';

import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/utils';

interface ImagePreviewProps {
	file?: File;
	alt: string;
	className?: string;
}

/**
 * ImagePreview Component
 *
 * Handles the generation and cleanup of object URLs for file previews.
 * Creates a new blob URL on every mount to ensure the URL is valid,
 * preventing ERR_FILE_NOT_FOUND errors when navigating between form steps.
 */
export function ImagePreview({ file, alt, className }: ImagePreviewProps) {
	const previewUrl = useBlobUrl(file ?? null);

	if (!previewUrl) {
		return (
			<div
				className={cn(
					'flex h-full w-full items-center justify-center',
					className,
				)}
			>
				<ImageIcon className="size-6 text-gray-400" />
			</div>
		);
	}

	return (
		<Image
			src={previewUrl}
			alt={alt}
			fill
			sizes="(max-width: 780px) 100vw, 780px"
			className={cn('object-contain', className)}
		/>
	);
}
