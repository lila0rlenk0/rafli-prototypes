'use client';

import type { SignedMediaUrl } from '@/types/raffle';
import { isSignedUrlExpired } from '@/lib/utils/is-signed-url-expired';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Image input type - supports both SignedMediaUrl objects and plain string URLs
 */
type ImageInput = SignedMediaUrl | string;

interface ImageCarouselProps {
	coverImage?: ImageInput | null;
	galleryImages?: ImageInput[];
	/** Array of image URLs (alternative to coverImage + galleryImages) */
	images?: ImageInput[];
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
 * Supports both SignedMediaUrl objects and plain string URLs.
 *
 * @param coverImage - The main cover image (shown first)
 * @param galleryImages - Array of gallery images
 * @param images - Alternative: array of all images (takes precedence)
 * @param alt - Alt text for accessibility
 * @param aspectRatio - Tailwind aspect ratio class (e.g., 'aspect-4/3')
 * @param maxHeight - Tailwind max height class (e.g., 'max-h-53')
 * @param className - Additional CSS classes
 */
export function ImageCarousel({
	coverImage,
	galleryImages = [],
	images: imagesProp,
	alt,
	aspectRatio = 'aspect-4/3',
	maxHeight = 'max-h-53',
	className = '',
}: ImageCarouselProps) {
	const router = useRouter();
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(0);
	const hasRefreshedForExpiredUrlsRef = useRef(false);

	/**
	 * Extracts URL from an image input (handles both string and SignedMediaUrl)
	 * @param image - Image input (string or SignedMediaUrl)
	 * @returns The URL string
	 */
	function getImageUrl(image: ImageInput): string {
		return typeof image === 'string' ? image : image.url;
	}

	/**
	 * Determines if the image input is expired.
	 * String URLs are treated as non-expiring because they have no metadata.
	 */
	function isExpiredImage(image: ImageInput): boolean {
		return typeof image === 'string' ? false : isSignedUrlExpired(image.expiresAt);
	}

	/**
	 * Builds a single array from cover and gallery images
	 * @returns Array of all image URLs
	 */
	function buildImageArray(): string[] {
		// If images prop is provided, use it directly
		if (imagesProp && imagesProp.length > 0) {
			return imagesProp.filter(image => !isExpiredImage(image)).map(getImageUrl);
		}

		// Otherwise build from cover + gallery
		const urls: string[] = [];

		if (coverImage && !isExpiredImage(coverImage)) {
			urls.push(getImageUrl(coverImage));
		}

		return [...urls, ...galleryImages.filter(image => !isExpiredImage(image)).map(getImageUrl)];
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
	const hasExpiredSignedImage = (imagesProp ?? [coverImage, ...galleryImages]).some(image => {
		if (!image) return false;
		return isExpiredImage(image);
	});

	useEffect(() => {
		// Step 1: Trigger exactly one refresh per mount if stale signed media is detected.
		// Why: stale RSC payload can include expired signed URLs; refresh rehydrates fresh URLs.
		if (!hasExpiredSignedImage || hasRefreshedForExpiredUrlsRef.current) return;
		hasRefreshedForExpiredUrlsRef.current = true;
		router.refresh();
	}, [hasExpiredSignedImage, router]);
	const showNavigation = shouldShowNavigation(images.length);
	const currentImageUrl = images[currentIndex];

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
			{currentImageUrl ? (
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
							src={currentImageUrl}
							alt={`${alt} - Image ${currentIndex + 1}`}
							fill
							sizes="100vw"
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

			{showNavigation && (
				<>
					<button
						type="button"
						onClick={handlePrevious}
						className="hover:text-background absolute top-1/2 left-3 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70"
						aria-label="Previous image"
					>
						<ChevronLeft className="h-5 w-5" />
					</button>
					<button
						type="button"
						onClick={handleNext}
						className="hover:text-background absolute top-1/2 right-3 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:bg-black/70"
						aria-label="Next image"
					>
						<ChevronRight className="h-5 w-5" />
					</button>
				</>
			)}

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
