import type { HostProfile } from '@/types/host';
import Image from 'next/image';

import { cn } from '@/lib/utils';

import { StarRating } from './star-rating';

interface HostProfileCardProps {
	/** Host profile data */
	host: HostProfile;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Displays host profile information in a sidebar card.
 * Server component - no client-side interactivity needed.
 * @returns Host profile card element
 */
export function HostProfileCard({ host, className }: HostProfileCardProps) {
	const displayName = host.name ?? host.username ?? 'Raffle Host';
	const hostInitial = displayName.charAt(0).toUpperCase();

	function formatRatingLabel(): string {
		if (host.averageRating === null || host.totalReviews === 0) {
			return 'No reviews yet';
		}
		return `${host.averageRating} (${host.totalReviews} ${host.totalReviews === 1 ? 'Review' : 'Reviews'})`;
	}

	return (
		<div
			className={cn(
				'flex flex-col overflow-hidden rounded-2xl bg-white p-6',
				className,
			)}
		>
			{/* Profile Image */}
			<div className="relative mx-auto mb-4 flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-3xl font-semibold">
				{host.image ? (
					<Image
						src={host.image}
						alt={displayName}
						fill
						sizes="112px"
						className="object-cover"
					/>
				) : (
					hostInitial
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
						{displayName}
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
