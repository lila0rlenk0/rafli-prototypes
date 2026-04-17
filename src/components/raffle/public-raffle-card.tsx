import { CheckCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
	const progress = isUnlimited
		? 0
		: Math.min((raffle.participantsCount / raffle.maxParticipants) * 100, 100);
	const hostName = raffle.host?.name ?? raffle.host?.username ?? 'Unknown';

	function getRoleTag(): { label: string; className: string } | null {
		if (!role) return null;
		if (role === 'host') {
			return {
				label: 'Host',
				className: 'bg-accent-cream text-accent-cream-foreground',
			};
		}
		return {
			label: 'Participant',
			className: 'bg-accent-green text-accent-green-foreground',
		};
	}

	function getTicketPrice(): string {
		return Number(raffle.ticketPriceAmount).toLocaleString('en-US', {
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

	return (
		<div
			data-testid="raffle-card"
			className="group relative flex w-full flex-col rounded-t-2xl rounded-b-3xl border border-transparent transition-colors duration-150 sm:hover:border-black"
		>
			{/* Image Header — fixed 16:9 container so every card has identical image height.
			     A true 16:9 source fills the box without any cropping; other ratios are
			     cropped symmetrically to maintain grid uniformity. */}
			<div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-gray-100">
				{raffle.coverMediaUrl ? (
					<Image
						src={raffle.coverMediaUrl}
						alt={raffle.title}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
					/>
				) : (
					<div className="flex h-full items-center justify-center bg-gray-200">
						<span className="text-sm text-gray-400">No image</span>
					</div>
				)}
				{/* Role tag — absolute overlay pinned to the image top-right. Lifted
				    out of the title row so the Details button aligns across cards
				    regardless of whether the title wraps to one or two lines.
				    `z-10` clears it above the image fill; it sits below the Link's
				    after:inset-0 overlay (z-auto) so clicks still route to details. */}
				{roleTag ? (
					<span
						className={cn(
							// absolute overlay pinned to image top-right; sizing tokens
							// (h/px/py/text/tracking) match the pre-move inline badge
							// so visual weight is preserved after lifting the tag out
							// of the title row. `z-10` clears the image fill; sits
							// below Link's after:inset-0 overlay (z-auto) so the whole
							// card remains clickable through the badge.
							'absolute top-2 right-2 z-10 inline-flex h-[19px] shrink-0 items-center justify-center rounded-lg px-6 py-1.5 text-[13px] font-semibold tracking-[0.26px] shadow-sm',
							roleTag.className,
						)}
					>
						{roleTag.label}
					</span>
				) : null}
			</div>

			{/* Card Body — tightened to 16px padding so card density matches the
			    reduced type scale; previous 24px left too much interior air after
			    the card title/price tokens dropped from 18/24 to 16/20. */}
			<div className="flex flex-1 flex-col gap-4 rounded-b-3xl bg-white p-4">
				{/* Title + Host */}
				<div className="flex flex-col gap-2">
					<div className="flex flex-col gap-2">
						{/* Title reserves two lines of vertical space via `min-h-[2lh]`
						    so single-line titles leave the same gap below as wrapped
						    two-line titles. Without this reservation the Details
						    button floats up on short titles and breaks row alignment
						    across the grid. `line-clamp-2` still truncates overflow;
						    `text-balance` keeps two-line wraps visually even. */}
						<h3 className="text-card-title min-h-[2lh] font-semibold text-balance text-[rgba(15,15,15,0.95)]">
							<Link
								href={`/browse/${raffle.publicSlugOrCode}`}
								className="line-clamp-2 after:absolute after:inset-0"
							>
								{raffle.title}
							</Link>
						</h3>

						{/* Host + Verified Badge */}
						<div className="flex items-center gap-2 sm:justify-between">
							<span className="text-sm text-[#121211]">by {hostName}</span>
							<span className="inline-flex items-center gap-1 rounded-lg border border-black px-1 py-0.5 text-xs text-[#121211]">
								<CheckCircle className="size-3.5" />
								Verified host
							</span>
						</div>
					</div>

					{/* Price + Time Remaining */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="font-clash-display text-card-price font-semibold text-[#182135]">
								${getTicketPrice()}
							</span>
							<div className="flex items-center gap-1 text-[#7b7b7b]">
								<Clock className="size-4" />
								<span className="text-sm">{getTimeRemaining()}</span>
							</div>
						</div>

						{/* Progress Bar */}
						{!isUnlimited ? (
							<div className="h-3 w-full overflow-hidden rounded-lg bg-[#eee]">
								<div
									className="h-full rounded-lg bg-[#84dcff] transition-all duration-300 ease-out"
									style={{ width: `${progress}%` }}
								/>
							</div>
						) : null}
					</div>
				</div>

				{/* Details Button */}
				<Button
					asChild
					variant="outline"
					className="relative z-10 h-12 w-full border-2 border-black text-sm font-semibold text-[#121211] hover:bg-black hover:text-white"
				>
					<Link href={`/browse/${raffle.publicSlugOrCode}`}>Details</Link>
				</Button>
			</div>
		</div>
	);
}
