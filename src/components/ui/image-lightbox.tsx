'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo } from 'react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from './dialog';

interface ImageLightboxProps {
	/** All images (File for new uploads, string URL for existing, null for empty slots) */
	images: Array<File | string | null>;
	/** Currently displayed image index */
	currentIndex: number;
	/** Open state */
	open: boolean;
	/** State change callback */
	onOpenChange: (open: boolean) => void;
	/** Navigation callback */
	onNavigate: (newIndex: number) => void;
}

/**
 * ImageLightbox Component
 *
 * Full-screen modal for viewing images with navigation support.
 * Handles both File objects and URL strings.
 * Supports keyboard navigation (arrow keys, Escape).
 */
export function ImageLightbox({
	images,
	currentIndex,
	open,
	onOpenChange,
	onNavigate,
}: ImageLightboxProps) {
	// Filter out null/empty images and map to their original indices
	const validImages = useMemo(() => {
		return images
			.map((img, idx) => ({ img, idx }))
			.filter(item => item.img !== null) as Array<{
			img: File | string;
			idx: number;
		}>;
	}, [images]);

	// Find current position in validImages array
	const currentValidIndex = useMemo(() => {
		return validImages.findIndex(item => item.idx === currentIndex);
	}, [validImages, currentIndex]);

	const hasPrevious = currentValidIndex > 0;
	const hasNext = currentValidIndex < validImages.length - 1;

	/**
	 * Navigate to previous image
	 */
	const goToPrevious = useCallback(() => {
		if (hasPrevious) {
			onNavigate(validImages[currentValidIndex - 1].idx);
		}
	}, [hasPrevious, currentValidIndex, validImages, onNavigate]);

	/**
	 * Navigate to next image
	 */
	const goToNext = useCallback(() => {
		if (hasNext) {
			onNavigate(validImages[currentValidIndex + 1].idx);
		}
	}, [hasNext, currentValidIndex, validImages, onNavigate]);

	// Handle keyboard navigation
	useEffect(() => {
		if (!open) return;

		function handleKeyDown(event: KeyboardEvent) {
			switch (event.key) {
				case 'ArrowLeft':
					goToPrevious();
					break;
				case 'ArrowRight':
					goToNext();
					break;
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [open, goToPrevious, goToNext]);

	// Get current image source
	const currentImage = images[currentIndex];

	// Generate preview URL for the current image
	const imageUrl = useMemo(() => {
		if (!currentImage) return null;
		if (typeof currentImage === 'string') return currentImage;
		return URL.createObjectURL(currentImage);
	}, [currentImage]);

	// Cleanup blob URL when component unmounts or image changes
	useEffect(() => {
		return () => {
			if (imageUrl && currentImage instanceof File) {
				URL.revokeObjectURL(imageUrl);
			}
		};
	}, [imageUrl, currentImage]);

	if (!imageUrl) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="flex h-[90vh] max-w-[90vw] flex-col items-center justify-center border-none bg-black/95 p-0"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Image Preview</DialogTitle>
				<DialogDescription className="sr-only">
					Viewing image {currentValidIndex + 1} of {validImages.length}
				</DialogDescription>

				{/* Custom white close button */}
				<DialogClose className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30">
					<X className="size-5 text-white" />
					<span className="sr-only">Close</span>
				</DialogClose>

				{/* Main image container */}
				<div className="relative flex h-full w-full items-center justify-center p-8">
					{/* Previous button */}
					{hasPrevious && (
						<button
							type="button"
							onClick={goToPrevious}
							className="absolute left-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
							aria-label="Previous image"
						>
							<ChevronLeft className="size-6 text-white" />
						</button>
					)}

					{/* Image */}
					<div className="relative h-full w-full">
						<Image
							src={imageUrl}
							alt={`Image ${currentIndex + 1}`}
							fill
							sizes="90vw"
							className="object-contain"
							unoptimized={typeof currentImage === 'string'}
						/>
					</div>

					{/* Next button */}
					{hasNext && (
						<button
							type="button"
							onClick={goToNext}
							className="absolute right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
							aria-label="Next image"
						>
							<ChevronRight className="size-6 text-white" />
						</button>
					)}
				</div>

				{/* Dot indicators */}
				{validImages.length > 1 && (
					<div className="absolute bottom-4 flex gap-2">
						{validImages.map((item, idx) => (
							<button
								key={item.idx}
								type="button"
								onClick={() => onNavigate(item.idx)}
								className={cn(
									'size-2 rounded-full transition-colors',
									idx === currentValidIndex
										? 'bg-white'
										: 'bg-white/40 hover:bg-white/60',
								)}
								aria-label={`Go to image ${idx + 1}`}
							/>
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
