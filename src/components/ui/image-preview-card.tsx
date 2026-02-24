'use client';

import { cn } from '@/lib/utils';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

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
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		// Handle null or undefined src
		if (!src) {
			// Safe to set state here: this only runs when `src` prop changes,
			// preventing cascading renders. This is the recommended pattern for resetting
			// state when a prop changes.
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setPreviewUrl(null);
			return;
		}

		// Handle string URLs (existing images)
		if (typeof src === 'string') {
			setPreviewUrl(src);
			return;
		}

		// Handle File objects (new uploads)
		const url = URL.createObjectURL(src);
		setPreviewUrl(url);

		// Cleanup: revoke the URL when component unmounts or src changes
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [src]);

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
					{onRemove && (
						<button
							type="button"
							onClick={handleRemove}
							className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/90"
							aria-label={`Remove image ${index + 1}`}
						>
							<Trash2 className="size-3 text-white" />
						</button>
					)}
				</>
			) : (
				<ImageIcon className="size-6 text-gray-400" />
			)}
		</div>
	);
}
