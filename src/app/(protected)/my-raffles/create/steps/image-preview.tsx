'use client';

import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

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
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!file) {
			// Safe to set state here: this only runs when `file` prop changes to null/undefined,
			// preventing cascading renders. This is the recommended pattern for resetting
			// state when a prop changes.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setPreviewUrl(null);
			return;
		}

		// Create a new blob URL every time the component mounts or file changes
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);

		// Cleanup: revoke the URL when component unmounts or file changes
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [file]);

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
			className={cn('object-contain', className)}
		/>
	);
}
