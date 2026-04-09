'use client';

import Image from 'next/image';
import { useState } from 'react';

import { ImageCarousel } from '@/components/ui/image-carousel';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface RaffleImageGalleryProps {
	coverImage: string | null;
	galleryImages: string[];
	alt: string;
}

/**
 * Raffle detail image gallery with lightbox support.
 * Combines the ImageCarousel (cover + gallery slides) with clickable
 * gallery thumbnails. Clicking any image opens a full-screen lightbox
 * with navigation across all images.
 *
 * @returns Image carousel, gallery thumbnails grid, and lightbox modal
 */
export function RaffleImageGallery({
	coverImage,
	galleryImages,
	alt,
}: RaffleImageGalleryProps) {
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);

	/** All images combined: cover first (if present), then gallery */
	const allImages: string[] = [
		...(coverImage ? [coverImage] : []),
		...galleryImages,
	];

	function handleCarouselClick(index: number) {
		setLightboxIndex(index);
		setLightboxOpen(true);
	}

	function handleThumbnailClick(galleryIndex: number) {
		// Gallery images start after cover (if present) in the combined array
		const offset = coverImage ? 1 : 0;
		setLightboxIndex(galleryIndex + offset);
		setLightboxOpen(true);
	}

	return (
		<>
			<ImageCarousel
				coverImage={coverImage}
				galleryImages={galleryImages}
				alt={alt}
				aspectRatio="aspect-video"
				maxHeight="max-h-96"
				className="border border-[#E5E5E5]"
				sizes="(max-width: 1024px) 100vw, 736px"
				priority
				onImageClick={handleCarouselClick}
			/>

			{galleryImages.length > 0 ? (
				<div className="grid grid-cols-3 gap-4">
					{galleryImages.map((image, index) => (
						<button
							key={index}
							type="button"
							onClick={() => handleThumbnailClick(index)}
							className="relative flex aspect-square max-h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white transition-opacity hover:opacity-80"
						>
							<Image
								src={image}
								alt={`Gallery ${index + 1}`}
								fill
								sizes="33vw"
								className="object-cover"
							/>
						</button>
					))}
				</div>
			) : null}

			<ImageLightbox
				images={allImages}
				currentIndex={lightboxIndex}
				open={lightboxOpen}
				onOpenChange={setLightboxOpen}
				onNavigate={setLightboxIndex}
			/>
		</>
	);
}
