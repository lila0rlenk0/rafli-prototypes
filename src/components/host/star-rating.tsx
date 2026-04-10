'use client';

// Marked 'use client' because the `interactive` mode uses `useState` for
// hover tracking and `onClick` handlers. The `display` mode renders without
// any client-only APIs, but React is fine with a client component being
// rendered inside a Server Component, so co-locating both modes in one file
// is the simplest path and avoids a second module just for the display case.

import { Star } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

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
 *   for decimal ratings (full / half / empty fill states).
 * - `mode="interactive"`: renders clickable buttons with hover feedback,
 *   intended for collecting a review rating. Half-star display is not
 *   supported in interactive mode — the input is whole-star only.
 *
 * Sizing differs intentionally between modes to preserve prior behavior:
 * display uses `size-8`, interactive uses `size-10` (larger hit target).
 *
 * @returns Star rating element — a `div` of `Star` icons in display mode,
 * or a `div` of `button` elements wrapping `Star` icons in interactive mode.
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
 * three full stars, one half, one empty.
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

type InteractiveStarsProps = {
	rating: number;
	onChange: (rating: number) => void;
	maxStars?: number;
	disabled?: boolean;
	className?: string;
};

/**
 * Clickable star input with hover preview. Only whole-star selection is
 * supported; hover on the Nth star previews a rating of N.
 */
function InteractiveStars({
	rating,
	onChange,
	maxStars = 5,
	disabled = false,
	className = '',
}: InteractiveStarsProps) {
	// Hover preview — `0` means "no active hover, show the committed rating".
	// Kept local because it's pure UI feedback, not app state.
	const [hoverRating, setHoverRating] = useState(0);

	function handleClick(starIndex: number) {
		if (disabled) return;
		onChange(starIndex);
	}

	function handleMouseEnter(starIndex: number) {
		if (disabled) return;
		setHoverRating(starIndex);
	}

	function handleMouseLeave() {
		setHoverRating(0);
	}

	// Hover takes precedence over the committed rating so the user sees
	// exactly what they'll pick on click. Falls back to `rating` when idle.
	function isFilled(starIndex: number): boolean {
		const activeRating = hoverRating === 0 ? rating : hoverRating;
		return starIndex <= activeRating;
	}

	return (
		<div
			className={cn('flex items-center gap-2', className)}
			onMouseLeave={handleMouseLeave}
		>
			{Array.from({ length: maxStars }).map((_, index) => {
				const starIndex = index + 1;
				const filled = isFilled(starIndex);

				return (
					<button
						key={starIndex}
						type="button"
						onClick={() => handleClick(starIndex)}
						onMouseEnter={() => handleMouseEnter(starIndex)}
						disabled={disabled}
						className={cn(
							'transition-transform focus:outline-none',
							disabled
								? 'cursor-not-allowed opacity-50'
								: 'cursor-pointer hover:scale-110',
						)}
						aria-label={`Rate ${starIndex} out of ${maxStars} stars`}
					>
						<Star
							className={cn(
								'size-10',
								filled
									? 'fill-yellow-400 text-yellow-400'
									: 'fill-transparent text-gray-300',
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}
