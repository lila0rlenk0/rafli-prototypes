import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StarRatingProps {
	/** The rating value (0-5) */
	rating: number;
	/** Maximum number of stars to display (default: 5) */
	maxStars?: number;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Displays a star rating with filled, half-filled, and empty stars.
 * Supports decimal ratings for partial star fills.
 * @returns Star rating display element
 */
export function StarRating({
	rating,
	maxStars = 5,
	className,
}: StarRatingProps) {
	function getStarFillState(index: number): 'full' | 'half' | 'empty' {
		const starPosition = index + 1;
		if (rating >= starPosition) return 'full';
		if (rating >= starPosition - 0.5) return 'half';
		return 'empty';
	}

	/** Maps fill state to the correct Tailwind color classes */
	function getStarClasses(fillState: 'full' | 'half' | 'empty'): string {
		switch (fillState) {
			case 'full':
				return 'fill-yellow-400 text-yellow-400';
			case 'half':
				return 'fill-yellow-400/50 text-yellow-400';
			case 'empty':
				return 'fill-transparent text-gray-300';
		}
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
