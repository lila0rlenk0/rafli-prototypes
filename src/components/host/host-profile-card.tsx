import type { HostProfile } from '@/types/host';
import Image from 'next/image';

import { StarRating } from './star-rating';

interface HostProfileCardProps {
	/** Host profile data */
	host: HostProfile;
	/** Additional CSS classes */
	className?: string;
}

/**
 * HostProfileCard Component
 *
 * Displays host profile information in a sidebar card.
 * Server component - no client-side interactivity needed.
 */
export function HostProfileCard({
	host,
	className = '',
}: HostProfileCardProps) {
	/**
	 * Gets the display name for the host
	 * @returns Host name or fallback username
	 */
	function getDisplayName(): string {
		return host.name || host.username || 'Raffle Host';
	}

	/**
	 * Gets the first initial of the host's name
	 * @returns First character of the name
	 */
	function getHostInitial(): string {
		const name = getDisplayName();
		return name.charAt(0).toUpperCase();
	}

	/**
	 * Formats the rating label for display
	 * @returns Formatted rating string or 'No reviews yet'
	 */
	function formatRatingLabel(): string {
		if (host.averageRating === null || host.totalReviews === 0) {
			return 'No reviews yet';
		}
		return `${host.averageRating} (${host.totalReviews} ${host.totalReviews === 1 ? 'Review' : 'Reviews'})`;
	}

	return (
		<div
			className={`flex flex-col overflow-hidden rounded-2xl bg-white p-6 ${className}`}
		>
			{/* Profile Image */}
			<div className="relative mx-auto mb-4 flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-3xl font-semibold">
				{host.image ? (
					<Image
						src={host.image}
						alt={getDisplayName()}
						fill
						sizes="112px"
						className="object-cover"
					/>
				) : (
					getHostInitial()
				)}
			</div>

			{/* Rating */}
			<div className="mb-2 flex flex-col items-center gap-2">
				<p className="text-[#7B7B7B]">Rating</p>
				<StarRating rating={host.averageRating ?? 0} />
				<span className="text-sm">{formatRatingLabel()}</span>
			</div>

			<div className="mt-4 flex flex-col gap-4">
				{/* Name */}
				<div className="flex flex-col items-center">
					<p className="text-[#7B7B7B]">Name</p>
					<p className="mb-1 text-center text-xl font-semibold">
						{getDisplayName()}
					</p>
				</div>

				{/* Bio */}
				<div className="flex flex-col items-center">
					<p className="text-[#7B7B7B]">Bio</p>
					<p className="text-sm">{host.bio ?? 'No bio yet'}</p>
				</div>
			</div>
		</div>
	);
}
