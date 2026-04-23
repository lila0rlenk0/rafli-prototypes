'use client';

// Client-only companion to `star-rating.tsx`. Owns the hover-state `useState`
// so the display-mode entry point in the sibling file can stay a shared
// module — Server Components (HostProfileCard, /host/[username]) import the
// display variant and must not pay the RSC → client hydration cost for read-only
// star rendering.

import { Star } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/class-names';

type InteractiveStarsProps = {
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
 * Clickable star input with hover preview. Whole-star selection only;
 * hovering on the Nth star previews a rating of N.
 *
 * Exported independently so `StarRating` (shared module) can reference it
 * without pulling `useState` into the server bundle. Callers should use
 * `<StarRating mode="interactive" .../>` rather than importing this directly —
 * the dispatch lives in `./star-rating` to keep the public surface unified.
 *
 * @param props - See {@link InteractiveStarsProps}
 * @returns Row of `button`-wrapped star icons with hover + click feedback
 */
export function InteractiveStars({
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
