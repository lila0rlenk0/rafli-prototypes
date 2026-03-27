import {
	CheckCircle,
	CircleDashed,
	CircleOff,
	Clock,
	Trophy,
} from 'lucide-react';
import Link from 'next/link';

import { ProvablyFairBadge } from '@/components/raffle/provably-fair-badge';
import { Button } from '@/components/ui/button';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { isAutoCancelled } from '@/lib/utils/cancellation-reason';
import { RAFFLE_STATUS, type Raffle, type RaffleStatus } from '@/types/raffle';

/** User's relationship to a raffle */
export type RaffleRole = 'host' | 'participant';

interface PublicRaffleCardProps {
	raffle: Raffle;
	role?: RaffleRole;
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
export function PublicRaffleCard({ raffle, role }: PublicRaffleCardProps) {
	const isUnlimited = raffle.maxParticipants === 0;

	/**
	 * Gets role tag styles based on user relationship
	 * @returns Label and className for the role pill, or null
	 */
	function getRoleTag(): { label: string; className: string } | null {
		if (!role) return null;
		if (role === 'host') {
			return {
				label: 'Host',
				className: 'bg-[#FAFFC4] text-[#998B53]',
			};
		}
		return {
			label: 'Participant',
			className: 'bg-[#BEFFDB] text-[#44B476]',
		};
	}

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

	/**
	 * Gets human-readable time remaining until raffle ends
	 * @returns Time remaining string (e.g. "2 days left", "3 months left")
	 */
	function getTimeRemaining(): string {
		const now = new Date();
		const end = new Date(raffle.endAt);
		const diffMs = end.getTime() - now.getTime();

		if (diffMs <= 0) return 'Ended';

		const diffDays = Math.ceil(diffMs / (1_000 * 60 * 60 * 24));

		if (diffDays >= 60) {
			const months = Math.floor(diffDays / 30);
			return `${months} months left`;
		}

		if (diffDays === 1) return '1 day left';
		return `${diffDays} days left`;
	}

	/**
	 * Gets status tag config based on raffle status
	 * @returns Label, icon, and color classes for the status badge
	 */
	function getStatusTag(status: RaffleStatus) {
		switch (status) {
			case RAFFLE_STATUS.LIVE:
				return {
					label: 'Active',
					icon: CheckCircle,
					className: 'text-green-600 bg-green-50',
				};
			case RAFFLE_STATUS.QUEUED:
				return {
					label: 'Scheduled',
					icon: Clock,
					className: 'text-blue-600 bg-blue-50',
				};
			case RAFFLE_STATUS.ENDED:
			case RAFFLE_STATUS.FULFILLING:
				return {
					label: 'Ended',
					icon: CircleOff,
					className: 'text-gray-600 bg-gray-100',
				};
			case RAFFLE_STATUS.COMPLETED:
				return {
					label: 'Completed',
					icon: Trophy,
					className: 'text-purple-600 bg-purple-50',
				};
			case RAFFLE_STATUS.CANCELLED:
				// Auto-cancelled (system) → orange, host-cancelled → red
				if (isAutoCancelled(raffle)) {
					return {
						label: 'Auto-Cancelled',
						icon: CircleOff,
						className: 'text-orange-600 bg-orange-50',
					};
				}
				return {
					label: 'Cancelled',
					icon: CircleOff,
					className: 'text-red-600 bg-red-50',
				};
			default:
				return {
					label: 'Draft',
					icon: CircleDashed,
					className: 'text-gray-500 bg-gray-50',
				};
		}
	}

	const statusTag = getStatusTag(raffle.status);
	const roleTag = getRoleTag();

	return (
		<div
			data-testid="raffle-card"
			className="group relative flex w-full flex-col overflow-hidden rounded-xl border-2 border-transparent bg-white transition-colors duration-150 hover:border-black sm:rounded-2xl"
		>
			<div className="relative z-10">
				<ImageCarousel
					coverImage={raffle.coverMediaUrl}
					galleryImages={raffle.galleryMediaUrls}
					alt={raffle.title}
					maxHeight=""
					className="mb-1.5 sm:mb-4"
					sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
				/>
			</div>

			<div className="flex flex-1 flex-col px-2 pb-2.5 sm:p-4">
				{/* Title — 2 lines max, readable on small screens */}
				<h3
					data-testid="raffle-card-title"
					className="mb-1 min-h-8 text-[13px] leading-4 font-bold tracking-tight text-gray-900 sm:mb-2 sm:min-h-14 sm:text-xl sm:leading-normal"
				>
					<Link
						href={`/browse/${raffle.publicSlugOrCode}`}
						className="line-clamp-2 after:absolute after:inset-0"
					>
						{raffle.title}
					</Link>
				</h3>

				{/* Time remaining + status — compact on mobile */}
				<div className="mb-1.5 flex items-center justify-between sm:mb-3">
					<div className="flex items-center gap-1 sm:gap-2">
						<span className="text-[11px] text-[#7B7B7B] sm:text-sm">
							{getTimeRemaining()}
						</span>
						{roleTag && (
							<span
								className={`hidden items-center rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${roleTag.className}`}
							>
								{roleTag.label}
							</span>
						)}
					</div>
					<span
						className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:gap-1.5 sm:px-2.5 sm:text-xs ${statusTag.className}`}
					>
						<statusTag.icon className="size-2.5 sm:size-3.5" />
						<span className="hidden sm:inline">{statusTag.label}</span>
					</span>
				</div>

				{raffle.status === RAFFLE_STATUS.COMPLETED && (
					<ProvablyFairBadge className="mb-1.5 sm:mb-2" />
				)}

				{/* Pricing — shortened labels on mobile */}
				<div className="mb-1.5 flex flex-col gap-0.5 sm:mb-4 sm:gap-0">
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground text-[11px] sm:text-sm">
							Ticket
						</p>
						<p className="text-xs font-semibold sm:text-xl">
							${getTicketPrice()}
						</p>
					</div>
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground text-[11px] sm:text-sm">
							Prize
						</p>
						<p className="text-xs font-semibold sm:text-xl">
							${getPrizeValue()}
						</p>
					</div>
				</div>

				{/* Participants + fill status */}
				<div className="mb-1 flex items-center justify-between text-[10px] sm:mb-2 sm:text-sm">
					<span className="text-[#7B7B7B]">{getParticipantsDisplay()}</span>
					<span className="text-[#7B7B7B]">{getFillStatus()}</span>
				</div>

				{/* Progress bar — thinner on mobile */}
				<div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 sm:mb-6 sm:h-[11px]">
					<div
						className="bg-primary h-full transition-all duration-300 ease-out"
						style={{ width: `${progress}%` }}
					/>
				</div>

				{/* Details button — min 44px touch target on mobile (Apple HIG) */}
				<Link
					href={`/browse/${raffle.publicSlugOrCode}`}
					className="relative z-10 mt-auto block"
				>
					<Button className="min-h-11 w-full cursor-pointer rounded-full border-2 border-black bg-black text-xs font-semibold text-white hover:bg-white hover:text-black sm:py-4 sm:text-sm">
						Details
					</Button>
				</Link>
			</div>
		</div>
	);
}
