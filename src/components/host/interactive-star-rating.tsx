'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface InteractiveStarRatingProps {
	/** Current rating value (1-5) or 0 if none selected */
	rating: number;
	/** Callback when rating changes */
	onChange: (rating: number) => void;
	/** Maximum number of stars (default: 5) */
	maxStars?: number;
	/** Whether the rating is disabled */
	disabled?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * InteractiveStarRating Component
 *
 * Clickable star rating input for submitting reviews.
 * Shows hover feedback and handles click selection.
 */
export function InteractiveStarRating({
	rating,
	onChange,
	maxStars = 5,
	disabled = false,
	className = '',
}: InteractiveStarRatingProps) {
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

	function isFilled(starIndex: number): boolean {
		return starIndex <= (hoverRating || rating);
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
							!disabled && 'cursor-pointer hover:scale-110',
							disabled && 'cursor-not-allowed opacity-50',
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
