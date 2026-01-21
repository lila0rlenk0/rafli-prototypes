'use client';

import { EditRaffleButton } from '@/components/raffle/edit-raffle-button';
import { RaffleShareButtons } from '@/components/raffle/raffle-share-buttons';
import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { useUserStore } from '@/providers/user-store-provider';
import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';
import { USER_MODE } from '@/types/user-mode';
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
	 * Determines if edit button should be shown
	 * Only for draft/queued raffles in host mode
	 * Returns false if mode is not yet initialized
	 */
	function shouldShowEditButton(): boolean {
		if (mode === null) {
			return false;
		}

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
	const showEditButton = shouldShowEditButton();

	/**
	 * Formats the progress percentage for display
	 * @param progressValue - The progress value (0-100)
	 * @returns Formatted percentage string rounded to nearest integer
	 */
	function formatProgressPercentage(progressValue: number): string {
		return `${progressValue.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		})}%`;
	}

	/**
	 * Formats the participant count display (current/max)
	 * @param current - Current number of participants
	 * @param max - Maximum number of participants
	 * @returns Formatted string in "current/max" format
	 */
	function formatParticipantCount(current: number, max: number): string {
		const formatter = new Intl.NumberFormat('en-US');

		return `${formatter.format(current)}/${formatter.format(max)}`;
	}

	function getTicketPrice() {
		const value = Number(raffle.ticketPriceAmount);
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	function getPrizeValue() {
		const prizeValue = Number(raffle.declaredValueAmount);
		return prizeValue.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	return (
		<div className="group flex min-w-70 flex-col overflow-hidden rounded-[24px] border-2 border-transparent bg-white transition-colors duration-150 hover:border-black">
			<ImageCarousel
				coverImage={raffle.coverMediaUrl}
				galleryImages={raffle.galleryMediaUrls}
				alt={raffle.title}
				className="mb-4"
			/>

			<div className="flex flex-1 flex-col p-4">
				<h3 className="mb-2 h-16 text-xl font-bold tracking-tight text-gray-900">
					{raffle.title}
				</h3>

				<div className="mb-4 flex flex-col">
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Ticket prize</p>
						<p className="text-xl font-semibold">${getTicketPrice()}</p>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground">Prize value</p>
						<p className="text-xl font-semibold">${getPrizeValue()}</p>
					</div>
				</div>

				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-[#7B7B7B]">
						{formatParticipantCount(
							raffle.participantsCount,
							raffle.maxParticipants,
						)}
					</span>
					<span className="text-[#7B7B7B]">
						{formatProgressPercentage(progress)} filled
					</span>
				</div>

				<div className="mb-6 h-[11px] w-full overflow-hidden rounded-full bg-gray-100">
					<div
						className="bg-primary h-full transition-all duration-300 ease-out"
						style={{ width: `${progress}%` }}
					/>
				</div>

				{showEditButton ? (
					<div className="mt-4">
						<EditRaffleButton publicSlug={raffle.publicSlugOrCode} />
					</div>
				) : (
					<Link
						href={`/browse/${raffle.publicSlugOrCode}`}
						className="mt-0 block"
					>
						<Button className="hover:bg-background w-full cursor-pointer rounded-full border-2 border-black bg-black py-4 font-semibold text-white hover:text-black">
							Details
						</Button>
					</Link>
				)}

				<RaffleShareButtons
					title={raffle.title}
					publicSlug={raffle.publicSlugOrCode}
				/>
			</div>
		</div>
	);
}
