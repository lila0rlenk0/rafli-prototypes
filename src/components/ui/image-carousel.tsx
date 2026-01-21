'use client';

import type { SignedMediaUrl } from '@/types/raffle';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface ImageCarouselProps {
	coverImage: SignedMediaUrl | null;
	galleryImages: SignedMediaUrl[];
	alt: string;
	aspectRatio?: string;
	maxHeight?: string;
	className?: string;
}

/**
 * ImageCarousel Component
 *
 * Displays a carousel of images combining cover and gallery images.
 * Features infinite loop navigation with smooth slide animations.
 *
 * @param coverImage - The main cover image (shown first)
 * @param galleryImages - Array of gallery images
 * @param alt - Alt text for accessibility
 * @param aspectRatio - Tailwind aspect ratio class (e.g., 'aspect-4/3')
 * @param maxHeight - Tailwind max height class (e.g., 'max-h-53')
 * @param className - Additional CSS classes
 */
export function ImageCarousel({
	coverImage,
	galleryImages,
	alt,
	aspectRatio = 'aspect-4/3',
	maxHeight = 'max-h-53',
	className = '',
}: ImageCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(0);

	/**
	 * Builds a single array from cover and gallery images
	 * @returns Array of all images with cover first
	 */
	function buildImageArray(): SignedMediaUrl[] {
		const images: SignedMediaUrl[] = [];

		if (coverImage) {
			images.push(coverImage);
		}

		return [...images, ...galleryImages];
	}

	/**
	 * Calculates the next index with infinite wrapping
	 * @param current - Current index
	 * @param delta - Direction to move (1 for next, -1 for prev)
	 * @param total - Total number of images
	 * @returns The wrapped index
	 */
	function getWrappedIndex(
		current: number,
		delta: number,
		total: number,
	): number {
		return (current + delta + total) % total;
	}

	/**
	 * Determines if navigation arrows should be shown
	 * @param total - Total number of images
	 * @returns True if more than one image exists
	 */
	function shouldShowNavigation(total: number): boolean {
		return total > 1;
	}

	/**
	 * Handles navigation to the next image
	 */
	function handleNext() {
		setDirection(1);
		setCurrentIndex(prev => getWrappedIndex(prev, 1, images.length));
	}

	/**
	 * Handles navigation to the previous image
	 */
	function handlePrevious() {
		setDirection(-1);
		setCurrentIndex(prev => getWrappedIndex(prev, -1, images.length));
	}

	const images = buildImageArray();
	const showNavigation = shouldShowNavigation(images.length);
	const currentImage = images[currentIndex];

	const slideVariants = {
		enter: (dir: number) => ({
			x: dir > 0 ? '100%' : '-100%',
			opacity: 0,
		}),
		center: {
			x: 0,
			opacity: 1,
		},
		exit: (dir: number) => ({
			x: dir > 0 ? '-100%' : '100%',
			opacity: 0,
		}),
	};

	return (
		<div
			className={`relative ${aspectRatio} ${maxHeight} w-full overflow-hidden rounded-2xl bg-gray-100 ${className}`}
		>
			{currentImage?.url ? (
				<AnimatePresence initial={false} custom={direction} mode="popLayout">
					<motion.div
						key={currentIndex}
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{
							x: { type: 'spring', stiffness: 200, damping: 20 },
							opacity: { duration: 0.2 },
						}}
						className="absolute inset-0"
					>
						<Image
							src={currentImage.url}
							alt={`${alt} - Image ${currentIndex + 1}`}
							fill
							className="rounded-2xl object-cover"
							loading="eager"
						/>
					</motion.div>
				</AnimatePresence>
			) : (
				<div className="flex h-full w-full items-center justify-center text-gray-300">
					<ImageIcon className="h-12 w-12" />
				</div>
			)}

			<button
				type="button"
				onClick={handlePrevious}
				className="hover:text-background absolute top-1/2 left-3 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:bg-black/50"
				aria-label="Previous image"
				disabled={!showNavigation}
			>
				<ChevronLeft className="h-5 w-5" />
			</button>
			<button
				type="button"
				onClick={handleNext}
				className="hover:text-background absolute top-1/2 right-3 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:bg-black/50"
				aria-label="Next image"
				disabled={!showNavigation}
			>
				<ChevronRight className="h-5 w-5" />
			</button>

			{showNavigation && (
				<div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
					{images.map((_, index) => (
						<div
							key={index}
							className={`h-1.5 w-1.5 rounded-full transition-colors ${
								index === currentIndex ? 'bg-background' : 'bg-background/50'
							}`}
						/>
					))}
				</div>
			)}
		</div>
	);
}
