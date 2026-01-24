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
export function HostProfileCard({ host, className = '' }: HostProfileCardProps) {
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
	 * Formats the rating for display
	 * @returns Formatted rating string or 'No reviews'
	 */
	function formatRating(): string {
		if (host.averageRating === null || host.totalReviews === 0) {
			return 'No reviews yet';
		}
		return `${host.averageRating.toFixed(1)} (${host.totalReviews} reviews)`;
	}

	/**
	 * Formats the total raffles count
	 * @returns Formatted string with label
	 */
	function formatRafflesCount(): string {
		const count = host.totalRafflesHosted;
		return `${count} ${count === 1 ? 'Raffle' : 'Raffles'} hosted`;
	}

	return (
		<div
			className={`flex flex-col overflow-hidden rounded-2xl bg-white p-6 ${className}`}
		>
			{/* Profile Image */}
			<div className="relative mx-auto mb-4 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-3xl font-semibold">
				{host.image?.url ? (
					<Image
						src={host.image.url}
						alt={getDisplayName()}
						fill
						className="object-cover"
					/>
				) : (
					getHostInitial()
				)}
			</div>

			{/* Rating */}
			<div className="mb-2 flex flex-col items-center gap-1">
				{host.averageRating !== null && host.totalReviews > 0 && (
					<StarRating rating={host.averageRating} />
				)}
				<span className="text-sm text-gray-500">{formatRating()}</span>
			</div>

			{/* Name */}
			<h2 className="mb-1 text-center text-xl font-bold">{getDisplayName()}</h2>

			{/* Raffles Count */}
			<p className="mb-4 text-center text-sm text-gray-500">
				{formatRafflesCount()}
			</p>

			{/* Bio */}
			{host.bio && (
				<div className="border-t border-gray-100 pt-4">
					<p className="text-sm text-gray-600">{host.bio}</p>
				</div>
			)}
		</div>
	);
}
