import { Star } from 'lucide-react';

interface StarRatingProps {
	/** The rating value (0-5) */
	rating: number;
	/** Maximum number of stars to display (default: 5) */
	maxStars?: number;
	/** Additional CSS classes */
	className?: string;
}

/**
 * StarRating Component
 *
 * Displays a star rating with filled, half-filled, and empty stars.
 * Supports decimal ratings for partial star fills.
 */
export function StarRating({
	rating,
	maxStars = 5,
	className = '',
}: StarRatingProps) {
	/**
	 * Generates star fill states for the rating
	 * @param index - Star index (0-based)
	 * @returns Fill state: 'full', 'half', or 'empty'
	 */
	function getStarFillState(index: number): 'full' | 'half' | 'empty' {
		const starPosition = index + 1;
		if (rating >= starPosition) return 'full';
		if (rating >= starPosition - 0.5) return 'half';
		return 'empty';
	}

	return (
		<div className={`flex items-center gap-0.5 ${className}`}>
			{Array.from({ length: maxStars }).map((_, index) => {
				const fillState = getStarFillState(index);
				return (
					<Star
						key={index}
						className={`size-4 ${
							fillState === 'full'
								? 'fill-yellow-400 text-yellow-400'
								: fillState === 'half'
									? 'fill-yellow-400/50 text-yellow-400'
									: 'fill-transparent text-gray-300'
						}`}
					/>
				);
			})}
		</div>
	);
}
