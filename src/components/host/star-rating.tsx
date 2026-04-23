// Shared module — NO `'use client'` directive on purpose.
//
// `HostProfileCard` and the public host profile page (`/host/[username]`) are
// Server Components that render the display variant. Marking this file client
// would collapse the RSC boundary and ship React hook runtime + the unused
// interactive code to every host-facing page for pure read-only star icons.
//
// The interactive variant (`<StarRating mode="interactive" />`) is a
// `useState`-backed component that legitimately needs the client. It lives
// in `./star-rating-interactive` with its own `'use client'` directive and
// is referenced below — Next.js crosses the boundary on demand, so server
// callers that only render display mode never pay for it.

import { Star } from 'lucide-react';

import { cn } from '@/lib/class-names';

import { InteractiveStars } from './star-rating-interactive';

/** Rendering state for a single star slot. */
type StarFillState = 'full' | 'half' | 'empty';

/**
 * Discriminated union — `mode` is the tag. TypeScript enforces that
 * `onChange` and `disabled` can only appear in the interactive branch,
 * and prevents passing them alongside `mode="display"`.
 */
type StarRatingProps =
	| {
			mode?: 'display';
			/** The rating value (0-5), supports decimals for half-star fills. */
			rating: number;
			/** Maximum number of stars to display (default: 5). */
			maxStars?: number;
			/** Additional CSS classes applied to the root wrapper. */
			className?: string;
	  }
	| {
			mode: 'interactive';
			/** Current rating value (1-5) or 0 if none selected. */
			rating: number;
			/** Callback fired with the clicked star's 1-based index. */
			onChange: (rating: number) => void;
			/** Maximum number of stars (default: 5). */
			maxStars?: number;
			/** When true, disables clicks and dims the stars. */
			disabled?: boolean;
			/** Additional CSS classes applied to the root wrapper. */
			className?: string;
	  };

/**
 * Unified star rating component.
 *
 * - `mode="display"` (default): renders non-interactive stars with support
 *   for decimal ratings (full / half / empty fill states). Runs server-side
 *   for Server Component callers — no client JS.
 * - `mode="interactive"`: delegates to `InteractiveStars` from the sibling
 *   `'use client'` module. React hydrates the boundary on the client; hover
 *   state and click handlers live there, not here.
 *
 * Sizing differs intentionally between modes to preserve prior behavior:
 * display uses `size-8`, interactive uses `size-10` (larger hit target).
 *
 * @returns Star rating element — a `div` of `Star` icons in display mode,
 * or an `InteractiveStars` client component in interactive mode.
 */
export function StarRating(props: StarRatingProps) {
	// Narrow on the discriminant once at the top so each branch renders
	// without repeated `props.mode` checks downstream.
	if (props.mode === 'interactive') {
		return <InteractiveStars {...props} />;
	}
	return <DisplayStars {...props} />;
}

/**
 * Maps a fill state to Tailwind color classes. Only `DisplayStars` needs the
 * three-way split because it supports decimal ratings (full/half/empty);
 * `InteractiveStars` uses binary filled/unfilled inline because whole-star
 * input can't produce a half state.
 */
function getStarClasses(fillState: StarFillState): string {
	switch (fillState) {
		case 'full':
			return 'fill-yellow-400 text-yellow-400';
		case 'half':
			return 'fill-yellow-400/50 text-yellow-400';
		case 'empty':
			return 'fill-transparent text-gray-300';
	}
}

type DisplayStarsProps = {
	rating: number;
	maxStars?: number;
	className?: string;
};

/**
 * Static star row. Supports decimal ratings — e.g. `rating={3.5}` renders
 * three full stars, one half, one empty. Pure function, no hooks — safe to
 * render inside Server Components.
 */
function DisplayStars({ rating, maxStars = 5, className }: DisplayStarsProps) {
	// Determines which of the three visual states applies to the Nth star.
	// `starPosition` is 1-based to match human-readable ratings.
	function getStarFillState(index: number): StarFillState {
		const starPosition = index + 1;
		if (rating >= starPosition) return 'full';
		if (rating >= starPosition - 0.5) return 'half';
		return 'empty';
	}

	return (
		<div className={cn('flex items-center gap-2', className)}>
			{Array.from({ length: maxStars }).map((_, index) => {
				const fillState = getStarFillState(index);
				return (
					<Star
						key={index}
						className={cn('size-8', getStarClasses(fillState))}
					/>
				);
			})}
		</div>
	);
}
