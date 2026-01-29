import { RaffleShareButtons } from '@/components/raffle/raffle-share-buttons';
import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/ui/image-carousel';
import type { Raffle } from '@/types/raffle';
import Link from 'next/link';

interface PublicRaffleCardProps {
	raffle: Raffle;
}

/**
 * PublicRaffleCard Component
 *
 * A simplified raffle card for the public browse page.
 * Unlike the protected RaffleCard, this doesn't use the user store
 * since non-authenticated users can't be in host mode.
 *
 * Displays a summary card for a raffle, including its cover image,
 * progress bar, and a details button.
 */
export function PublicRaffleCard({ raffle }: PublicRaffleCardProps) {
	const isUnlimited = raffle.maxParticipants === 0;

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

	const progress = calculateProgress(
		raffle.participantsCount,
		raffle.maxParticipants,
	);

	/**
	 * Gets the fill status text
	 * @returns "Unlimited" for unlimited raffles, otherwise percentage
	 */
	function getFillStatus(): string {
		if (isUnlimited) return 'Unlimited';
		return `${progress.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		})}% filled`;
	}

	/**
	 * Gets the participants display text
	 * @returns Only current count for unlimited, otherwise "current/max"
	 */
	function getParticipantsDisplay(): string {
		const formatter = new Intl.NumberFormat('en-US');
		if (isUnlimited) {
			return formatter.format(raffle.participantsCount);
		}
		return `${formatter.format(raffle.participantsCount)}/${formatter.format(raffle.maxParticipants)}`;
	}

	/**
	 * Gets formatted ticket price
	 * @returns Formatted price string
	 */
	function getTicketPrice(): string {
		const value = Number(raffle.ticketPriceAmount);
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	/**
	 * Gets formatted prize value
	 * @returns Formatted prize value string
	 */
	function getPrizeValue(): string {
		const prizeValue = Number(raffle.declaredValueAmount);
		return prizeValue.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	return (
		<div className="group flex w-full flex-col overflow-hidden rounded-[24px] border-2 border-transparent bg-white transition-colors duration-150 hover:border-black">
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
					<span className="text-[#7B7B7B]">{getParticipantsDisplay()}</span>
					<span className="text-[#7B7B7B]">{getFillStatus()}</span>
				</div>

				<div className="mb-6 h-[11px] w-full overflow-hidden rounded-full bg-gray-100">
					<div
						className="bg-primary h-full transition-all duration-300 ease-out"
						style={{ width: `${progress}%` }}
					/>
				</div>

				<Link
					href={`/browse/${raffle.publicSlugOrCode}`}
					className="mt-0 block"
				>
					<Button className="w-full cursor-pointer rounded-full border-2 border-black bg-black py-4 font-semibold text-white hover:bg-white hover:text-black">
						Details
					</Button>
				</Link>

				<RaffleShareButtons
					title={raffle.title}
					publicSlug={raffle.publicSlugOrCode}
				/>
			</div>
		</div>
	);
}
