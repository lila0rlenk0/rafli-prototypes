'use client';

import { ChevronLeft, ChevronRight, VideoOff, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import type { RaffleMediaItem } from '@/lib/utils/media';
import { getVideoMimeType, getVideoThumbnailUrl } from '@/lib/utils/media';
import { cn } from '@/lib/utils';

interface RaffleMediaLightboxProps {
	items: readonly RaffleMediaItem[];
	currentIndex: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onNavigate: (newIndex: number) => void;
}

// Cap the bottom dot strip so galleries with many items don't overflow the
// viewport on narrow phones. Same threshold as the carousel for consistency.
const MAX_DOT_INDICATORS = 8;

/**
 * Fullscreen lightbox for raffle media with keyboard navigation.
 *
 * Mobile sizing uses `dvh`/`dvw` so Safari's dynamic URL bar doesn't cause
 * layout jump mid-interaction. On `md+` the modal shrinks to 90/90 with
 * breathing room. Padding also scales down on mobile to maximise the media
 * area on narrow screens.
 *
 * Videos autoplay with `muted` — iOS Safari blocks unmuted autoplay, so
 * starting muted gives a working preview and the user can unmute via the
 * native volume control. Keyed by URL so switching slides fully unmounts
 * the previous player and stops playback.
 *
 * @returns modal dialog when `open`, nothing when closed or no media
 */
export function RaffleMediaLightbox({
	items,
	currentIndex,
	open,
	onOpenChange,
	onNavigate,
}: RaffleMediaLightboxProps) {
	const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(
		() => new Set(),
	);

	const hasPrevious = currentIndex > 0;
	const hasNext = currentIndex < items.length - 1;

	const goToPrevious = useCallback(() => {
		if (hasPrevious) onNavigate(currentIndex - 1);
	}, [hasPrevious, currentIndex, onNavigate]);

	const goToNext = useCallback(() => {
		if (hasNext) onNavigate(currentIndex + 1);
	}, [hasNext, currentIndex, onNavigate]);

	// Global arrow-key navigation while the lightbox is open.
	// Scoped via `open` dep so the listener is only attached when visible.
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

	function markFailed(url: string) {
		setFailedUrls(prev => {
			if (prev.has(url)) return prev;
			const next = new Set(prev);
			next.add(url);
			return next;
		});
	}

	const current = items[currentIndex];
	if (!current) return null;

	const total = items.length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="flex h-dvh w-dvw max-w-none flex-col items-center justify-center border-none bg-black/95 p-0 md:h-[90dvh] md:w-[90dvw]"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Media preview</DialogTitle>
				<DialogDescription className="sr-only">
					Viewing {current.type} {currentIndex + 1} of {total}
				</DialogDescription>

				<DialogClose
					className="absolute top-4 right-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
					aria-label="Close preview"
				>
					<X className="size-5 text-white" />
					<span className="sr-only">Close</span>
				</DialogClose>

				<div className="relative flex h-full w-full items-center justify-center p-4 md:p-8">
					{hasPrevious ? (
						<button
							type="button"
							onClick={goToPrevious}
							className="absolute left-3 z-10 flex size-11 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 md:left-4"
							aria-label="Previous media"
						>
							<ChevronLeft className="size-6 text-white" />
						</button>
					) : null}

					<div className="relative flex h-full w-full items-center justify-center">
						<LightboxSlide
							// Remount on URL change so the previous video element
							// fully unmounts and playback stops. Without this, React
							// reuses the <video> and the audio bleeds across slides.
							key={current.url}
							item={current}
							index={currentIndex}
							failed={failedUrls.has(current.url)}
							onMediaError={() => markFailed(current.url)}
						/>
					</div>

					{hasNext ? (
						<button
							type="button"
							onClick={goToNext}
							className="absolute right-3 z-10 flex size-11 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 md:right-4"
							aria-label="Next media"
						>
							<ChevronRight className="size-6 text-white" />
						</button>
					) : null}
				</div>

				{total > 1 && total <= MAX_DOT_INDICATORS ? (
					<div className="absolute bottom-4 flex gap-2">
						{items.map((_, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => onNavigate(idx)}
								className={cn(
									'size-2 rounded-full transition-colors',
									idx === currentIndex
										? 'bg-white'
										: 'bg-white/40 hover:bg-white/60',
								)}
								aria-label={`Go to media ${idx + 1}`}
							/>
						))}
					</div>
				) : null}

				{total > MAX_DOT_INDICATORS ? (
					<div
						className="absolute bottom-4 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white"
						aria-live="polite"
					>
						{currentIndex + 1} / {total}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

interface LightboxSlideProps {
	item: RaffleMediaItem;
	index: number;
	failed: boolean;
	onMediaError: () => void;
}

function LightboxSlide({
	item,
	index,
	failed,
	onMediaError,
}: LightboxSlideProps) {
	if (failed) {
		return (
			<div className="flex flex-col items-center gap-3 text-white/80">
				<VideoOff className="size-10" aria-hidden="true" />
				<span className="text-sm">Media unavailable</span>
			</div>
		);
	}

	if (item.type === 'video') {
		const thumbnail = getVideoThumbnailUrl(item.url);
		const mimeType = getVideoMimeType(item.url);
		return (
			<video
				// `key` on the wrapping LightboxSlide forces remount on URL
				// change so the previous player stops. No `key` needed here.
				poster={thumbnail ?? undefined}
				controls
				// `muted` is mandatory for iOS autoplay — without it the browser
				// silently blocks playback. Users can unmute via native controls.
				autoPlay
				muted
				playsInline
				preload="metadata"
				onError={onMediaError}
				className="h-full max-h-full w-full max-w-full object-contain"
				aria-label={`Video ${index + 1}`}
			>
				<source src={item.url} type={mimeType ?? undefined} />
				Your browser cannot play this video.{' '}
				<a href={item.url} className="text-white underline">
					Download it
				</a>{' '}
				instead.
			</video>
		);
	}

	return (
		<Image
			src={item.url}
			alt={`Image ${index + 1}`}
			fill
			sizes="(max-width: 768px) 100vw, 90vw"
			className="object-contain"
			onError={onMediaError}
			// unoptimized — CDN already serves webp/avif; routing through
			// next/image would double-transform and double-cache.
			unoptimized
		/>
	);
}
