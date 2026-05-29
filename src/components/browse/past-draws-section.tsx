'use client';

import Autoplay from 'embla-carousel-autoplay';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';

import { PastDrawCard } from '@/components/browse/past-draw-card';
import {
	type CarouselApi,
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/class-names';
import type { Raffle } from '@/types/raffle';

// Slower than Recent Winners (4s) because each Past Draw card carries
// more detail (prize, winner, on-chain link) that rewards a longer dwell.
// 6s lets the eye finish a card before the next snap.
const AUTOPLAY_DELAY_MS = 6_000;

interface PastDrawsSectionProps {
	raffles: readonly Raffle[];
}

/**
 * "Past Draws" carousel on /browse — concluded raffles with on-chain
 * verification + dot pagination.
 *
 * Client Component — shadcn `Carousel` wraps Embla which requires client
 * hooks; the dot pagination additionally subscribes to Embla events to
 * track the active snap index. Data still flows in from the parent Server
 * Component.
 *
 * Pagination model: Embla snap points (derived from slide basis + container
 * width) define each "page". At xl with `basis-1/4` and 12 raffles that's
 * 3 pages; at mobile with `basis-full` it's 12 pages. Dots adapt automatically
 * on resize via Embla's `reInit` event — no manual recomputation needed.
 */
export function PastDrawsSection({ raffles }: PastDrawsSectionProps) {
	// `api` becomes defined once the Carousel mounts and wires up Embla.
	// Holding it in state (rather than a ref) lets the subscription hooks
	// below re-bind when the API becomes available.
	const [api, setApi] = useState<CarouselApi>();

	// Plugin instance pinned in a ref so re-renders never hand Embla a
	// fresh `[Autoplay(...)]` array (that would re-init the carousel and
	// reset the dot index, which the `useSyncExternalStore` hooks below
	// are already wired to track).
	//
	// `stopOnInteraction: false` — the dot row is the primary nav on this
	// section, and stopping autoplay permanently after a dot click would
	// surprise users mid-scan. Pause-then-resume keeps the section feeling
	// live without fighting deliberate navigation.
	// `stopOnMouseEnter: true` is the user-requested hover pause.
	const autoplay = useRef(
		Autoplay({
			delay: AUTOPLAY_DELAY_MS,
			stopOnInteraction: false,
			stopOnMouseEnter: true,
		}),
	);

	// mount: stop autoplay if the OS reports prefers-reduced-motion.
	// Read once on mount — reactive OS changes are an acceptable trade-off
	// for removing the framer-motion dependency (deliberate per audit).
	useEffect(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			autoplay.current.stop();
		}
	}, []);

	/**
	 * Embla is an external store. Per the project's react-effects rule,
	 * we subscribe via `useSyncExternalStore` rather than syncing state in
	 * a `useEffect` — that pattern trips `react-hooks/set-state-in-effect`
	 * and the hook version also integrates correctly with React 18
	 * concurrent rendering (consistent snapshots across a transition).
	 *
	 * Single `subscribe` callback drives both reads below: Embla's `select`
	 * event fires on snap changes (drag/click/scrollTo) and `reInit` fires
	 * on viewport resize. Either → React re-reads both getSnapshot fns.
	 */
	const subscribeCarousel = useCallback(
		(callback: () => void) => {
			if (!api) return () => {};
			api.on('select', callback);
			api.on('reInit', callback);
			return () => {
				api.off('select', callback);
				api.off('reInit', callback);
			};
		},
		[api],
	);

	/**
	 * Total pagination page count.
	 * `scrollSnapList()` returns an array of snap positions — length is
	 * the number of dots to render. `?? 0` during SSR / before api resolves.
	 */
	const snapCount = useSyncExternalStore(
		subscribeCarousel,
		() => api?.scrollSnapList().length ?? 0,
		() => 0,
	);

	/**
	 * Active pagination page (0-indexed).
	 * Reads Embla's current snap — always in sync with drag/click state.
	 */
	const selectedSnap = useSyncExternalStore(
		subscribeCarousel,
		() => api?.selectedScrollSnap() ?? 0,
		() => 0,
	);

	return (
		<section className="flex flex-col gap-6">
			<header className="flex flex-col gap-1">
				<h2 className="font-clash-display tracking-micro text-ink-900 text-2xl/none font-semibold sm:text-3xl">
					Past Draws
				</h2>
				<p className="text-ink-500 text-sm">
					See who won — results verified on-chain.
				</p>
			</header>

			<Carousel
				setApi={setApi}
				/* `align: 'start'` keeps the first card pinned to the left.
				   `loop: true` so autoplay doesn't visibly stall on the final
				   page — without the wrap, the section would dead-end and
				   the dot row would freeze on the last index until the user
				   reloads. The dot pagination still renders true page count
				   from `scrollSnapList()`, which already accounts for the
				   loop seam. */
				opts={{ align: 'start', loop: true }}
				plugins={[autoplay.current]}
				aria-label="Past draws"
			>
				{/* Three-column flex row so arrows flank the carousel viewport without
				    overlaying cards. See RecentWinnersSection for the full rationale —
				    the same `flex-1 min-w-0` trick applies: without `min-w-0`, Embla's
				    `basis-*` children force overflow and the layout collapses. */}
				<div className="flex items-center gap-3 sm:gap-4">
					<CarouselPrevious className="static hidden translate-y-0 sm:flex" />
					<div className="min-w-0 flex-1">
						<CarouselContent className="-ml-6">
							{raffles.map(raffle => (
								/* Slide sizing mirrors the original grid (1/2/3/4 across
								   breakpoints) so migrating from grid → carousel doesn't
								   change card density at any viewport. pl-6 matches the
								   original grid gap-6 spacing. */
								<CarouselItem
									key={raffle.id}
									className="basis-full pl-6 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
								>
									<PastDrawCard raffle={raffle} />
								</CarouselItem>
							))}
						</CarouselContent>
					</div>
					<CarouselNext className="static hidden translate-y-0 sm:flex" />
				</div>

				{/* Dot pagination — only renders when there's more than one page worth
				    of content. Single-page carousels (e.g., 3 raffles at xl with 4
				    visible per page) don't need pagination UI, and showing a lone
				    dot would look like a decorative bug.

				    ARIA note: intentionally NOT using `role="tablist"/"tab"` here —
				    the WAI-ARIA tabs pattern implies tab-panels that swap in/out, but
				    these buttons just scroll a continuous carousel. Plain `<button>`
				    with `aria-label` + `aria-current="true"` is the correct pattern
				    for pagination controls inside a single region. */}
				{snapCount > 1 ? (
					<div
						className="mt-6 flex items-center justify-center gap-2"
						role="group"
						aria-label="Past draws pagination"
					>
						{Array.from({ length: snapCount }).map((_, index) => {
							const isActive = index === selectedSnap;
							return (
								<button
									// Index key is safe here: snapCount resets the whole
									// strip on reInit, so stale keys aren't a concern, and
									// there's no stable per-snap identifier Embla exposes.
									key={index}
									type="button"
									aria-current={isActive ? 'true' : undefined}
									aria-label={`Go to page ${index + 1} of ${snapCount}`}
									/* Default tweened scroll — rapid dot-clicks feel fine at
									   the slide counts this surface carries. Pass `true` as the
									   second arg here if we ever render long strips where the
									   tween starts to feel sluggish. */
									onClick={() => api?.scrollTo(index)}
									className={cn(
										'h-2 rounded-full transition-all duration-200',
										isActive
											? 'bg-ink-900 w-6'
											: 'bg-ink-900/20 hover:bg-ink-900/40 w-2',
									)}
								/>
							);
						})}
					</div>
				) : null}
			</Carousel>
		</section>
	);
}
