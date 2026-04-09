'use client';

import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface ImagePreviewCardProps {
	/** File for new uploads, URL for existing, null for empty */
	src: File | string | null;
	/** Accessibility text */
	alt: string;
	/** Position in array (for callbacks) */
	index: number;
	/** Remove callback */
	onRemove?: (index: number) => void;
	/** Preview callback */
	onPreview?: (index: number) => void;
	/** Upload callback for empty state click */
	onUpload?: () => void;
	/** Additional class names */
	className?: string;
}

/**
 * ImagePreviewCard Component
 *
 * Unified component for image display with remove and preview functionality.
 * Handles both File objects (blob URLs) and URL strings.
 * Shows Trash icon button on hover to remove.
 * Clickable for full-screen preview when filled, triggers upload when empty.
 */
export function ImagePreviewCard({
	src,
	alt,
	index,
	onRemove,
	onPreview,
	onUpload,
	className,
}: ImagePreviewCardProps) {
	// Derive the preview URL: strings pass through, Files get a managed blob URL
	const blobUrl = useBlobUrl(src instanceof File ? src : null);
	const previewUrl = typeof src === 'string' ? src : blobUrl;

	/**
	 * Checks if the card is interactive (clickable)
	 */
	function isInteractive(): boolean {
		return Boolean(previewUrl && onPreview) || Boolean(!previewUrl && onUpload);
	}

	/**
	 * Handles click on the image card
	 */
	function handleClick() {
		if (previewUrl && onPreview) {
			onPreview(index);
			return;
		}
		if (!previewUrl && onUpload) {
			onUpload();
		}
	}

	/**
	 * Handles click on the remove button
	 * @param event - Mouse event
	 */
	function handleRemove(event: React.MouseEvent) {
		event.stopPropagation();
		if (onRemove) {
			onRemove(index);
		}
	}

	return (
		<div
			className={cn(
				'group relative flex aspect-square max-h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white',
				isInteractive() && 'cursor-pointer',
				!previewUrl && onUpload && 'transition-colors hover:border-gray-400',
				className,
			)}
			onClick={handleClick}
			onKeyDown={event => {
				if (event.key === 'Enter' || event.key === ' ') {
					handleClick();
				}
			}}
			role={isInteractive() ? 'button' : undefined}
			tabIndex={isInteractive() ? 0 : undefined}
		>
			{previewUrl ? (
				<>
					<Image
						src={previewUrl}
						alt={alt}
						fill
						sizes="112px"
						className="object-cover"
						unoptimized={typeof src === 'string'}
					/>
					{onRemove ? (
						<button
							type="button"
							onClick={handleRemove}
							className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/90"
							aria-label={`Remove image ${index + 1}`}
						>
							<Trash2 className="size-3 text-white" />
						</button>
					) : null}
				</>
			) : (
				<ImageIcon className="size-6 text-gray-400" />
			)}
		</div>
	);
}
