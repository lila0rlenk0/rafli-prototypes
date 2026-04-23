'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, VideoOff } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';

import type { RaffleMediaItem } from '@/lib/utils/media/media';
import {
	getVideoMimeType,
	getVideoThumbnailUrl,
} from '@/lib/utils/media/media';
import { cn } from '@/lib/class-names';

interface RaffleMediaCarouselProps {
	items: readonly RaffleMediaItem[];
	alt: string;
	/**
	 * Invoked when an image slide is clicked — used to open the lightbox.
	 * Videos intentionally do not trigger this: native `<video>` controls
	 * need click/tap events, and hijacking them would break play/pause/seek.
	 */
	onImageClick?: (index: number) => void;
}

// Hoisted — framer-motion re-applies variants when the reference changes,
// which would restart animations mid-transition if defined inline.
const slideVariants = {
	enter: (dir: number) => ({
		x: dir > 0 ? '100%' : '-100%',
		opacity: 0,
	}),
	center: { x: 0, opacity: 1 },
	exit: (dir: number) => ({
		x: dir > 0 ? '-100%' : '100%',
		opacity: 0,
	}),
};

// Cap the number of rendered dot indicators so very long galleries don't
// overflow the carousel footer on narrow viewports. Beyond this, we switch
// to a numeric "N / total" badge — still informative, doesn't break layout.
const MAX_DOT_INDICATORS = 8;

/**
 * Hero carousel for raffle media (images and videos mixed).
 *
 * Images render via `next/image` (optimized, priority preload on first slide).
 * Videos render via native `<video>` with inline controls + a derived thumbnail
 * (see {@link getVideoThumbnailUrl}) so the first frame appears instantly even
 * on slow mobile connections.
 *
 * Animations gate on `prefers-reduced-motion` — framer-motion's spring is
 * disabled for users with the OS-level setting enabled.
 *
 * @returns carousel element with navigation when >1 item, empty placeholder
 * when the items array is empty
 */
export function RaffleMediaCarousel({
	items,
	alt,
	onImageClick,
}: RaffleMediaCarouselProps) {
	// `direction` drives the slide animation (positive = next, negative = prev).
	// Tracked separately from the index so framer-motion can pick the correct
	// enter/exit variant after the index changes.
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(0);
	// Per-index error flag — keyed by URL so we only suppress the failed slide,
	// not the whole carousel. A separate Set would also work; a record is
	// trivially serialisable for future React Query caching.
	const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const reducedMotion = useReducedMotion();

	const total = items.length;

	const goNext = useCallback(() => {
		setDirection(1);
		setCurrentIndex(prev => (prev + 1) % total);
	}, [total]);

	const goPrevious = useCallback(() => {
		setDirection(-1);
		setCurrentIndex(prev => (prev - 1 + total) % total);
	}, [total]);

	function markFailed(url: string) {
		setFailedUrls(prev => {
			if (prev.has(url)) return prev;
			const next = new Set(prev);
			next.add(url);
			return next;
		});
	}

	const current = items[currentIndex];
	const showNavigation = total > 1;
	// aspect-video + bounded height keeps the hero consistent across devices.
	// `max-h-96` on mobile would crop to 384px; combined with `aspect-video`
	// (16:9) this yields a natural responsive shape.
	const frameClasses =
		'relative aspect-video max-h-96 w-full overflow-hidden rounded-2xl border border-[#E5E5E5] bg-gray-100';

	if (!current) {
		// Empty gallery — reserve the same slot so the page doesn't reflow
		// once media loads. Matches the aspect ratio + border of a real slide.
		return <div className={frameClasses} />;
	}

	return (
		<div className={frameClasses}>
			<AnimatePresence initial={false} custom={direction} mode="popLayout">
				<motion.div
					key={currentIndex}
					custom={direction}
					variants={slideVariants}
					initial={reducedMotion ? false : 'enter'}
					animate="center"
					exit={reducedMotion ? undefined : 'exit'}
					transition={{
						x: { type: 'spring', stiffness: 200, damping: 20 },
						opacity: { duration: 0.2 },
					}}
					className="absolute inset-0"
				>
					<CarouselSlide
						item={current}
						alt={alt}
						index={currentIndex}
						onImageClick={onImageClick}
						failed={failedUrls.has(current.url)}
						onMediaError={() => markFailed(current.url)}
					/>
				</motion.div>
			</AnimatePresence>

			{showNavigation ? (
				<>
					<button
						type="button"
						onClick={goPrevious}
						className="absolute top-1/2 left-3 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white/90 transition-colors hover:bg-black/70"
						aria-label="Previous media"
					>
						<ChevronLeft className="size-6" />
					</button>
					<button
						type="button"
						onClick={goNext}
						className="absolute top-1/2 right-3 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white/90 transition-colors hover:bg-black/70"
						aria-label="Next media"
					>
						<ChevronRight className="size-6" />
					</button>

					{total <= MAX_DOT_INDICATORS ? (
						<div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
							{items.map((_, index) => (
								<div
									key={index}
									className={cn(
										'size-1.5 rounded-full transition-colors',
										index === currentIndex
											? 'bg-background'
											: 'bg-background/50',
									)}
								/>
							))}
						</div>
					) : (
						<div
							className="absolute right-3 bottom-3 z-10 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white/90"
							aria-live="polite"
						>
							{currentIndex + 1} / {total}
						</div>
					)}
				</>
			) : null}
		</div>
	);
}

interface CarouselSlideProps {
	item: RaffleMediaItem;
	alt: string;
	index: number;
	failed: boolean;
	onImageClick?: (index: number) => void;
	onMediaError: () => void;
}

/**
 * Renders a single slide — picks the correct element per media type and
 * handles its own error fallback so a single broken URL doesn't black
 * out the entire carousel frame.
 *
 * @returns video, image, or error placeholder
 */
function CarouselSlide({
	item,
	alt,
	index,
	failed,
	onImageClick,
	onMediaError,
}: CarouselSlideProps) {
	if (failed) {
		return <MediaFallback />;
	}

	if (item.type === 'video') {
		const thumbnail = getVideoThumbnailUrl(item.url);
		const mimeType = getVideoMimeType(item.url);
		return (
			<video
				// `controls` — native play/pause/seek/fullscreen.
				// `playsInline` — iOS Safari otherwise forces fullscreen on play.
				// `preload="metadata"` — fetches only the moov atom (~tens of KB)
				// so duration + thumbnail frame show instantly without pulling the
				// full file. Faststart encoding keeps the moov up front.
				// `poster` — HTML5 attribute, paints before metadata arrives, critical on 3G/4G.
				poster={thumbnail ?? undefined}
				controls
				playsInline
				preload="metadata"
				onError={onMediaError}
				className="h-full w-full rounded-2xl bg-black object-contain"
				aria-label={`${alt} — video ${index + 1}`}
			>
				{/* `<source type>` lets browsers reject unsupported codecs
				    without a network fetch. When MIME is unknown we omit
				    `type` and let the browser probe via HTTP range. */}
				<source src={item.url} type={mimeType ?? undefined} />
				{/* Fallback text shown by browsers that cannot play the video —
				    legacy browsers, text-only clients, or when the source is
				    blocked by CORS. Keeps the element semantic. */}
				Your browser cannot play this video.{' '}
				<a href={item.url} className="underline">
					Download it
				</a>{' '}
				instead.
			</video>
		);
	}

	return (
		<button
			type="button"
			onClick={onImageClick ? () => onImageClick(index) : undefined}
			className={cn(
				'absolute inset-0 h-full w-full',
				onImageClick ? 'cursor-pointer' : 'cursor-default',
			)}
			aria-label={`Open image ${index + 1} in lightbox`}
		>
			<Image
				src={item.url}
				alt={`${alt} — image ${index + 1}`}
				fill
				sizes="(max-width: 1024px) 100vw, 736px"
				className="rounded-2xl object-cover"
				onError={onMediaError}
				// LCP optimization: only the first slide is preloaded —
				// subsequent slides load on user interaction.
				priority={index === 0}
			/>
		</button>
	);
}

/**
 * Fallback shown in-place when media fails to load (404, CORS, decode error).
 * Uses muted tokens so it reads as a graceful degradation, not an alarm.
 *
 * @returns centered icon + label
 */
function MediaFallback() {
	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400">
			<VideoOff className="size-8" aria-hidden="true" />
			<span className="text-sm">Media unavailable</span>
		</div>
	);
}
