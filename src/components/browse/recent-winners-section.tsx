'use client';

import Link from 'next/link';

import { RecentWinnerCard } from '@/components/browse/recent-winner-card';
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '@/components/ui/carousel';
import type { RecentWinner } from '@/types/winning';

interface RecentWinnersSectionProps {
	winners: readonly RecentWinner[];
}

/**
 * "Most recent winners!" single-line carousel on /browse.
 *
 * Client Component — the shadcn `Carousel` wraps Embla, which needs client
 * hooks (`useEmblaCarousel`). The data itself still flows in from the parent
 * Server Component; we only cross the boundary for the interactive surface.
 *
 * Why single-line + carousel instead of a grid: the strip sits above the main
 * live-raffles grid and should feel like a ticker / newsreel, not a second
 * catalog. One line keeps the section low-commitment vertically so visitors
 * reach the primary content faster, while the carousel affords discovery of
 * winners beyond the first two without pushing the page down.
 */
export function RecentWinnersSection({ winners }: RecentWinnersSectionProps) {
	return (
		<section className="flex flex-col gap-6">
			<header className="flex items-center justify-between gap-4">
				<h2 className="font-clash-display tracking-micro text-ink-900 text-2xl/none font-semibold sm:text-3xl">
					Most recent winners!
				</h2>
				<Link
					href="/past-winners"
					className="text-ink-500 hover:text-ink-900 text-sm underline-offset-4 hover:underline"
				>
					View all past winners
				</Link>
			</header>

			<Carousel
				/* `align: 'start'` pins the first slide to the left edge on init so
				   the section reads left-to-right. `loop: false` — a raffle archive
				   isn't infinite content, and wrapping back to the first winner
				   after reaching the end would falsely suggest continuous data. */
				opts={{ align: 'start', loop: false }}
				/* Explicit aria-label — shadcn sets `role="region"` + `aria-roledescription="carousel"`
				   but leaves labeling to the consumer. Without this, screen readers
				   announce "carousel" with no context; pairing it with the nearby
				   h2 text gives assistive-tech users a meaningful landmark. */
				aria-label="Most recent winners"
			>
				{/* Arrows flank the carousel viewport instead of overlaying cards.
				    Three-column flex row: [prev] | [carousel track] | [next].
				    - `shrink-0` on the buttons so they keep their ergonomic hit area
				      at every breakpoint instead of squishing when cards are wide.
				    - `flex-1 min-w-0` on the middle wrapper lets the carousel take
				      the remaining space. `min-w-0` is critical: Embla's inner track
				      is `flex` with child items that have `basis-*` — without
				      `min-w-0` on the parent, the intrinsic width of those items
				      forces overflow and the layout collapses.
				    - Buttons hidden on mobile (`hidden sm:flex`) where native swipe
				      is the ergonomic gesture and the buttons would crowd the
				      viewport. On mobile the middle wrapper naturally consumes the
				      full row width because the siblings are `display: none`. */}
				<div className="flex items-center gap-3 sm:gap-4">
					<CarouselPrevious className="static hidden translate-y-0 sm:flex" />
					<div className="min-w-0 flex-1">
						<CarouselContent className="-ml-4">
							{winners.map(winner => (
								/* Slide sizing:
								   - mobile: `basis-full` → one card visible, full viewport width
								   - sm: `basis-1/2` → two cards, matches the original static grid
								   - lg: `basis-1/3` → three cards at desktop densities so the row
								     feels like a ticker instead of repeating the grid above.
								   Composite key — same raffle can contribute multiple winning
								   positions, so raffleId alone collides. */
								<CarouselItem
									key={`${winner.raffleId}:${winner.position}`}
									className="basis-full pl-4 sm:basis-1/2 lg:basis-1/3"
								>
									<RecentWinnerCard winner={winner} />
								</CarouselItem>
							))}
						</CarouselContent>
					</div>
					<CarouselNext className="static hidden translate-y-0 sm:flex" />
				</div>
			</Carousel>
		</section>
	);
}
