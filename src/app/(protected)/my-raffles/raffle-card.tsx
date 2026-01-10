'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Raffle, RAFFLE_STATUS, RaffleStatus } from '@/types/raffle';
import {
	CheckCircle2,
	Clock,
	Copy,
	Image as ImageIcon,
	Share2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

interface RaffleCardProps {
	raffle: Raffle;
}

/**
 * RaffleCard Component
 *
 * Displays a summary card for a raffle, including its cover image, status,
 * progress bar, and action buttons.
 */
export function RaffleCard({ raffle }: RaffleCardProps) {
	/**
	 * Calculates the percentage of filled spots in a raffle
	 * @param current - Current number of participants
	 * @param max - Maximum number of participants
	 * @returns Percentage value between 0 and 100
	 */
	const calculateProgress = (current: number, max: number): number => {
		if (max === 0) return 0;
		return Math.min((current / max) * 100, 100);
	};

	/**
	 * Calculates the number of days remaining until the raffle ends
	 * @param endDateStr - ISO string of the end date
	 * @returns Number of days remaining (0 if ended)
	 */
	const calculateDaysLeft = (endDateStr: string): number => {
		const now = new Date();
		const end = new Date(endDateStr);
		const diffTime = Math.max(0, end.getTime() - now.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	/**
	 * Copies the raffle link to the clipboard
	 * @param slug - The public slug or code of the raffle
	 */
	const handleCopyLink = (slug: string) => {
		const link = `${window.location.origin}/raffles/${slug}`;
		navigator.clipboard.writeText(link);
		toast.success('Raffle link copied to clipboard!');
	};

	/**
	 * Opens a Twitter/X share intent in a new tab
	 * @param title - The title of the raffle
	 * @param slug - The public slug or code of the raffle
	 */
	const handleShare = (title: string, slug: string) => {
		const text = `Check out this raffle: ${title}`;
		const link = `${window.location.origin}/raffles/${slug}`;
		const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
		window.open(url, '_blank');
	};

	const progress = calculateProgress(
		raffle.participantsCount,
		raffle.maxParticipants,
	);
	const daysLeft = calculateDaysLeft(raffle.endAt);

	const getStatusBadge = (status: RaffleStatus) => {
		switch (status) {
			case RAFFLE_STATUS.LIVE:
				return (
					<Badge
						variant="secondary"
						className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-100"
					>
						<CheckCircle2 className="h-3 w-3" />
						Active
					</Badge>
				);
			case RAFFLE_STATUS.ENDED:
			case RAFFLE_STATUS.COMPLETED:
				return (
					<Badge
						variant="secondary"
						className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-100"
					>
						<Clock className="h-3 w-3" />
						Ended
					</Badge>
				);
			case RAFFLE_STATUS.DRAFT:
				return (
					<Badge
						variant="outline"
						className="flex items-center gap-1 border-gray-200 text-gray-500"
					>
						Draft
					</Badge>
				);
			default:
				return null;
		}
	};

	return (
		<div className="group flex flex-col overflow-hidden rounded-[24px] bg-white">
			<div className="relative mb-4 aspect-4/3 max-h-53 w-full overflow-hidden rounded-2xl bg-gray-100">
				{raffle.coverMediaUrl ? (
					<Image
						src={raffle.coverMediaUrl}
						alt={raffle.title}
						fill
						className="object-cover"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-gray-300">
						<ImageIcon className="h-12 w-12" />
					</div>
				)}

				{/* Navigation arrows (mock for carousel) */}
				{raffle.galleryMediaUrls.length > 0 && (
					<>
						<div className="absolute top-1/2 left-4 -translate-y-1/2 cursor-pointer text-white/80 transition-colors hover:text-white">
							{/* Left Arrow Icon */}
						</div>
						<div className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-white/80 transition-colors hover:text-white">
							{/* Right Arrow Icon */}
						</div>
					</>
				)}
			</div>

			<div className="flex flex-1 flex-col p-4">
				<h3 className="mb-2 text-xl font-bold tracking-tight text-gray-900">
					{raffle.title}
				</h3>

				<div className="mb-4 flex items-center justify-between">
					<span className="text-sm font-medium text-gray-500">
						{daysLeft} days left
					</span>
					{getStatusBadge(raffle.status as RaffleStatus)}
				</div>

				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-gray-500">
						{raffle.participantsCount}/{raffle.maxParticipants}
					</span>
					<span className="font-medium text-gray-900">
						{Math.round(progress)}% filled
					</span>
				</div>

				<div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-100">
					<div
						className="h-full bg-green-400 transition-all duration-300 ease-out"
						style={{ width: `${progress}%` }}
					/>
				</div>

				<div className="mt-auto flex items-center justify-between gap-4">
					<span className="text-sm font-medium text-gray-500">
						Participants
					</span>
					<span className="text-lg font-bold text-gray-900">
						{raffle.participantsCount}
					</span>
				</div>

				<Link href={`/browse/${raffle.id}`} className="mt-4 block">
					<Button className="w-full rounded-full bg-black py-6 text-base font-medium text-white hover:bg-gray-800">
						Details
					</Button>
				</Link>

				<div className="mt-6 flex items-center justify-between px-2">
					<button
						onClick={() => handleShare(raffle.title, raffle.publicSlugOrCode)}
						className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
					>
						<Share2 className="h-4 w-4" />
						Share on X
					</button>
					<button
						onClick={() => handleCopyLink(raffle.publicSlugOrCode)}
						className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black"
					>
						<Copy className="h-4 w-4" />
						Copy Raffle link
					</button>
				</div>
			</div>
		</div>
	);
}
