'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { RaffleMediaCarousel } from '@/components/raffle/raffle-media-carousel';
import type { RaffleMediaItem } from '@/lib/utils/media';
import {
	getVideoThumbnailUrl,
	isVideoUrl,
	toMediaItem,
} from '@/lib/utils/media';
import { cn } from '@/lib/utils';

/**
 * Lightbox loads lazily on first open — it ships Radix Dialog and its
 * slide renderer, neither of which are needed until the user clicks a
 * thumbnail or an image slide. `ssr: false` skips SSR since the modal
 * is never visible on first paint anyway, and keeps it out of the
 * initial HTML payload.
 */
const RaffleMediaLightbox = dynamic(
	() =>
		import('@/components/raffle/raffle-media-lightbox').then(
			mod => mod.RaffleMediaLightbox,
		),
	{ ssr: false },
);

interface RaffleMediaGalleryProps {
	/** Cover media — always an image today (backend enforces this). */
	coverImage: string | null;
	/** Gallery entries — may contain both images and videos. */
	galleryImages: readonly string[];
	/** Descriptive alt text for accessibility, used as prefix. */
	alt: string;
}

/**
 * Top-level raffle media gallery composing the hero carousel, a thumbnail
 * grid, and a fullscreen lightbox.
 *
 * Video detection runs on URL extension via {@link isVideoUrl}. The cover
 * is pinned as an image (schema invariant). Clicking any thumbnail opens
 * the lightbox at the matching index; videos autoplay muted in the lightbox
 * for iOS compatibility.
 *
 * @returns carousel + thumbnail grid + lightbox triad
 */
export function RaffleMediaGallery({
	coverImage,
	galleryImages,
	alt,
}: RaffleMediaGalleryProps) {
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);
	// Latches on first open so the lightbox stays mounted for exit animations
	// and doesn't re-trigger the dynamic import on every subsequent open.
	// Without this flag the modal would re-fetch its chunk each close/open
	// if we conditionally unmounted on `lightboxOpen === false`.
	const [lightboxEverOpened, setLightboxEverOpened] = useState(false);

	// Memoized to keep the reference stable across renders — the lightbox
	// and carousel both receive this array, and unnecessary new references
	// would invalidate their internal memoization (and the video `key` that
	// controls remount-on-swap).
	const allMedia: readonly RaffleMediaItem[] = useMemo(() => {
		const items: RaffleMediaItem[] = [];
		if (coverImage) items.push({ type: 'image', url: coverImage });
		for (const url of galleryImages) items.push(toMediaItem(url));
		return items;
	}, [coverImage, galleryImages]);

	function openLightboxAt(index: number) {
		setLightboxIndex(index);
		setLightboxOpen(true);
		setLightboxEverOpened(true);
	}

	function handleCarouselImageClick(index: number) {
		openLightboxAt(index);
	}

	function handleThumbnailClick(galleryIndex: number) {
		// Thumbnails only list gallery items; cover (if present) occupies
		// index 0 in the combined array — add 1 to align with `allMedia`.
		const offset = coverImage ? 1 : 0;
		openLightboxAt(galleryIndex + offset);
	}

	return (
		<>
			<RaffleMediaCarousel
				items={allMedia}
				alt={alt}
				onImageClick={handleCarouselImageClick}
			/>

			{galleryImages.length > 0 ? (
				<div className="grid grid-cols-3 gap-2 sm:gap-4">
					{galleryImages.map((url, index) => (
						<GalleryThumbnail
							key={url}
							url={url}
							index={index}
							onClick={handleThumbnailClick}
						/>
					))}
				</div>
			) : null}

			{/* Mount lightbox only after first open — initial page render
			    skips its bundle entirely. Once mounted it stays for the rest
			    of the session so close/re-open animations work and Radix
			    Dialog's unmount sequence isn't fighting dynamic import. */}
			{lightboxEverOpened ? (
				<RaffleMediaLightbox
					items={allMedia}
					currentIndex={lightboxIndex}
					open={lightboxOpen}
					onOpenChange={setLightboxOpen}
					onNavigate={setLightboxIndex}
				/>
			) : null}
		</>
	);
}

interface GalleryThumbnailProps {
	url: string;
	index: number;
	onClick: (galleryIndex: number) => void;
}

/**
 * Single gallery-grid tile. For videos we render the derived thumbnail
 * JPG via `next/image` + a play-icon overlay — cheaper than a `<video>`
 * element (which would fetch metadata for every tile on mount, costly
 * on mobile data). If the thumbnail 404s, `onError` falls back to a plain
 * black preview with the play icon still visible so the item remains
 * visibly playable.
 *
 * @returns button wrapping the media preview
 */
function GalleryThumbnail({ url, index, onClick }: GalleryThumbnailProps) {
	const isVideo = isVideoUrl(url);
	const thumbnailUrl = isVideo ? getVideoThumbnailUrl(url) : null;
	const [thumbnailFailed, setThumbnailFailed] = useState(false);

	return (
		<button
			type="button"
			onClick={() => onClick(index)}
			className={cn(
				'focus-visible:ring-primary relative flex aspect-square w-full min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:max-h-32',
			)}
			aria-label={
				isVideo ? `Play video ${index + 1}` : `Open image ${index + 1}`
			}
		>
			{isVideo ? (
				<>
					{thumbnailUrl && !thumbnailFailed ? (
						<Image
							src={thumbnailUrl}
							alt=""
							fill
							sizes="(max-width: 640px) 33vw, 240px"
							className="object-cover"
							onError={() => setThumbnailFailed(true)}
						/>
					) : (
						// Black frame is a reasonable fallback when the thumbnail
						// is missing — the play overlay still signals playability.
						<div className="absolute inset-0 bg-black" aria-hidden="true" />
					)}
					<span
						className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
						aria-hidden="true"
					>
						<span className="flex size-10 items-center justify-center rounded-full bg-black/60">
							<PlayIcon />
						</span>
					</span>
				</>
			) : (
				<Image
					src={url}
					alt={`Gallery ${index + 1}`}
					fill
					sizes="(max-width: 640px) 33vw, 240px"
					className="object-cover"
				/>
			)}
		</button>
	);
}

// Inline SVG — avoids a lucide-react import just for one decorative icon
// on a hot render path (thumbnails multiply per gallery entry).
function PlayIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-5 text-white"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M8 5v14l11-7z" />
		</svg>
	);
}
