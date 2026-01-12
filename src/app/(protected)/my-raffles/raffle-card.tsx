'use client';

import { EditRaffleButton } from '@/components/raffle/edit-raffle-button';
import { RaffleShareButtons } from '@/components/raffle/raffle-share-buttons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/providers/user-store-provider';
import { Raffle, RAFFLE_STATUS, RaffleStatus } from '@/types/raffle';
import { USER_MODE } from '@/types/user-mode';
import { CheckCircle2, Clock, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
	const mode = useUserStore(state => state.mode);

	/**
	 * Calculates the percentage of filled spots in a raffle
	 * @param current - Current number of participants
	 * @param max - Maximum number of participants
	 * @returns Percentage value between 0 and 100
	 */
	function calculateProgress(current: number, max: number): number {
		if (max === 0) return 0;
		return Math.min((current / max) * 100, 100);
	}

	/**
	 * Calculates the number of days remaining until the raffle ends
	 * @param endDateStr - ISO string of the end date
	 * @returns Number of days remaining (0 if ended)
	 */
	function calculateDaysLeft(endDateStr: string): number {
		const now = new Date();
		const end = new Date(endDateStr);
		const diffTime = Math.max(0, end.getTime() - now.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	/**
	 * Determines if edit button should be shown
	 * Only for draft/queued raffles in host mode
	 */
	function shouldShowEditButton(): boolean {
		const isHostMode = mode === USER_MODE.HOST;
		const isEditable =
			raffle.status === RAFFLE_STATUS.DRAFT ||
			raffle.status === RAFFLE_STATUS.QUEUED;

		return isHostMode && isEditable;
	}

	const progress = calculateProgress(
		raffle.participantsCount,
		raffle.maxParticipants,
	);
	const daysLeft = calculateDaysLeft(raffle.endAt);
	const showEditButton = shouldShowEditButton();

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
				{raffle.coverMediaUrl.url ? (
					<Image
						src={raffle.coverMediaUrl.url}
						alt={raffle.title}
						fill
						className="object-cover"
						loading="eager"
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

				{showEditButton ? (
					<div className="mt-4">
						<EditRaffleButton raffleId={raffle.id} />
					</div>
				) : (
					<Link href={`/browse/${raffle.id}`} className="mt-4 block">
						<Button className="w-full rounded-full bg-black py-6 text-base font-medium text-white hover:bg-gray-800">
							Details
						</Button>
					</Link>
				)}

				<RaffleShareButtons
					title={raffle.title}
					publicSlugOrCode={raffle.publicSlugOrCode}
				/>
			</div>
		</div>
	);
}
