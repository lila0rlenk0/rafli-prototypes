import { CheckCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { Raffle } from '@/types/raffle';

/** User's relationship to a raffle */
export type RaffleRole = 'host' | 'participant';

interface PublicRaffleCardProps {
	raffle: Raffle;
	role?: RaffleRole;
}

/**
 * PublicRaffleCard Component
 *
 * Redesigned raffle card for the browse page grid.
 * Features a cover image header, title with optional role badge,
 * host info with verified badge, price/time row, progress bar,
 * and an outlined Details button. Hover shows 1px black border.
 */
export function PublicRaffleCard({ raffle, role }: PublicRaffleCardProps) {
	const isUnlimited = raffle.maxParticipants === 0;

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

	function calculateProgress(current: number, max: number): number {
		if (max === 0) return 0;
		return Math.min((current / max) * 100, 100);
	}

	const progress = calculateProgress(
		raffle.participantsCount,
		raffle.maxParticipants,
	);

	function getTicketPrice(): string {
		const value = Number(raffle.ticketPriceAmount);
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	function getTimeRemaining(): string {
		const now = new Date();
		const end = new Date(raffle.endAt);
		const diffMs = end.getTime() - now.getTime();
		if (diffMs <= 0) return 'Ended';
		const diffDays = Math.ceil(diffMs / (1_000 * 60 * 60 * 24));
		if (diffDays >= 60) return `${Math.floor(diffDays / 30)} months left`;
		if (diffDays === 1) return '1 day left';
		return `${diffDays} days left`;
	}

	const roleTag = getRoleTag();
	const hostName =
		raffle.host?.name || raffle.host?.username || 'Unknown';

	return (
		<div
			data-testid="raffle-card"
			className="group relative flex w-full flex-col overflow-hidden border border-transparent transition-colors duration-150 hover:border-black"
		>
			{/* Image Header */}
			<div className="relative h-[140px] w-full overflow-hidden rounded-t-2xl bg-gray-100">
				{raffle.coverMediaUrl ? (
					<Image
						src={raffle.coverMediaUrl}
						alt={raffle.title}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
					/>
				) : (
					<div className="flex size-full items-center justify-center bg-gray-200">
						<span className="text-sm text-gray-400">No image</span>
					</div>
				)}
			</div>

			{/* Card Body */}
			<div className="flex flex-1 flex-col gap-4 rounded-b-3xl bg-white p-6">
				{/* Title + Role Tag */}
				<div className="flex flex-col gap-2">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<h3 className="text-lg font-semibold leading-none text-[rgba(15,15,15,0.95)]">
								<Link
									href={`/browse/${raffle.publicSlugOrCode}`}
									className="line-clamp-1 after:absolute after:inset-0"
								>
									{raffle.title}
								</Link>
							</h3>
							{roleTag && (
								<span
									className={`inline-flex h-[19px] items-center justify-center rounded-lg px-6 py-1.5 text-[13px] font-semibold tracking-[0.26px] ${roleTag.className}`}
								>
									{roleTag.label}
								</span>
							)}
						</div>

						{/* Host + Verified Badge */}
						<div className="flex items-center gap-2 sm:justify-between">
							<span className="text-sm text-[#121211]">by {hostName}</span>
							<span className="inline-flex items-center gap-1 rounded-[10px] border border-black px-1 py-0.5 text-xs text-[#121211]">
								<CheckCircle className="size-3.5" />
								Verified host
							</span>
						</div>
					</div>

					{/* Price + Time Remaining */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="font-clash-display text-2xl font-semibold leading-tight tracking-[0.12px] text-[#182135]">
								${getTicketPrice()}
							</span>
							<div className="flex items-center gap-1 text-[#7b7b7b]">
								<Clock className="size-4" />
								<span className="text-sm">{getTimeRemaining()}</span>
							</div>
						</div>

						{/* Progress Bar */}
						{!isUnlimited && (
							<div className="h-[11px] w-full overflow-hidden rounded-lg bg-[#eee]">
								<div
									className="h-full rounded-lg bg-[#84dcff] transition-all duration-300 ease-out"
									style={{ width: `${progress}%` }}
								/>
							</div>
						)}
					</div>
				</div>

				{/* Details Button */}
				<Link
					href={`/browse/${raffle.publicSlugOrCode}`}
					className="relative z-10 block"
				>
					<button
						type="button"
						className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-[#121211] text-sm font-semibold text-[#121211] transition-colors hover:bg-black hover:text-white"
					>
						Details
					</button>
				</Link>
			</div>
		</div>
	);
}
