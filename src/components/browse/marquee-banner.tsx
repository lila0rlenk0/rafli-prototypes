// 'use client' — CSS marquee animation keyframes run per-frame on the
// client; SSR would paint a static first frame and flash when hydration
// flips to the animated variant. Keeping this leaf a client boundary
// keeps the rest of the browse/subscribe headers RSC.
'use client';

import { cn } from '@/lib/class-names';

// Repetition count chosen so the joined strip overflows the widest
// supported viewport (`--container-wide` 1720px) with headroom, so the
// `animate-marquee` `0% → -50%` keyframe never exposes the seam.
const REPEAT_COUNT = 8;

interface MarqueeBannerProps {
	/**
	 * Message scrolled across the strip. Required because the same
	 * banner ships on /browse (yellow, raffle-share promo) and
	 * /subscribe (blue, value-prop line) with different copy — a
	 * default would drift stale on whichever surface loses priority.
	 */
	readonly message: string;
	/**
	 * Tailwind background class controlling the accent colour. Defaults
	 * to `bg-brand-yellow` so /browse callers opt in to yellow without
	 * repeating the token. /subscribe passes `bg-brand-sky` to swap to
	 * the blue variant of the same shell.
	 */
	readonly bgClassName?: string;
}

/**
 * Sticky horizontal-scroll banner pinned beneath `PublicNavbar`.
 *
 * @returns Accent-coloured strip that repeats `message` across the viewport
 */
export function MarqueeBanner({
	message,
	bgClassName = 'bg-brand-yellow',
}: MarqueeBannerProps) {
	return (
		<div
			className={cn(
				'relative z-(--z-sticky) overflow-hidden border-b border-black',
				bgClassName,
			)}
		>
			<div className="animate-marquee flex items-center gap-2 py-1.5 whitespace-nowrap sm:py-2">
				{Array.from({ length: REPEAT_COUNT }).map((_, i) => (
					<span key={i} className="flex items-center gap-2">
						<span className="text-navy text-label-md sm:text-body-md font-semibold">
							{message}
						</span>
						<span className="bg-navy inline-block size-2 rounded-full" />
					</span>
				))}
			</div>
		</div>
	);
}
