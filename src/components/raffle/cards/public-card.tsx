import { CheckCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import type { Raffle } from '@/types/raffle';

interface PublicRaffleCardProps {
	raffle: Raffle;
}

/**
 * PublicRaffleCard Component
 *
 * Redesigned raffle card for the browse page grid. Cover image header, title,
 * host info with verified badge, price/time row, progress bar, and an outlined
 * Details button. Hover shows 1px black border.
 */
export function PublicRaffleCard({ raffle }: PublicRaffleCardProps) {
	const isUnlimited = raffle.maxParticipants === 0;
	const progress = isUnlimited
		? 0
		: Math.min((raffle.participantsCount / raffle.maxParticipants) * 100, 100);
	// Progress comes from a derived participant ratio — Tailwind `w-<fraction>`
	// can't bind to that, so pass the width through a named style object.
	const progressFillStyle: CSSProperties = { width: `${progress}%` };
	const hostName = raffle.host?.name ?? raffle.host?.username ?? 'Unknown';

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
						<h3 className="text-body-md min-h-2lh text-ink-alpha font-semibold text-balance">
							<Link
								href={`/browse/${raffle.publicSlugOrCode}`}
								className="line-clamp-2 after:absolute after:inset-0"
							>
								{raffle.title}
							</Link>
						</h3>

						{/* Host + Verified Badge */}
						<div className="flex items-center gap-2 sm:justify-between">
							<span className="text-ink-900 text-sm">by {hostName}</span>
							<span className="text-ink-900 inline-flex items-center gap-1 rounded-lg border border-black px-1 py-0.5 text-xs">
								<CheckCircle className="size-3.5" />
								Verified host
							</span>
						</div>
					</div>

					{/* Price + Time Remaining */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="font-clash-display text-headline-sm text-navy font-semibold">
								${getTicketPrice()}
							</span>
							<div className="text-ink-500 flex items-center gap-1">
								<Clock className="size-4" />
								<span className="text-sm">{getTimeRemaining()}</span>
							</div>
						</div>

						{/* Progress Bar */}
						{!isUnlimited ? (
							<div className="bg-ink-150 h-3 w-full overflow-hidden rounded-lg">
								<div
									className="h-full rounded-lg bg-sky-300 transition-all duration-300 ease-out"
									style={progressFillStyle}
								/>
							</div>
						) : null}
					</div>
				</div>

				{/* Details Button */}
				<Button
					asChild
					variant="outline"
					className="text-ink-900 relative z-10 h-12 w-full border-2 border-black text-sm font-semibold hover:bg-black hover:text-white"
				>
					<Link href={`/browse/${raffle.publicSlugOrCode}`}>Details</Link>
				</Button>
			</div>
		</div>
	);
}
