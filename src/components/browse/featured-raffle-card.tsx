import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { Raffle } from '@/types/raffle';

type FeaturedVariant = 'blue' | 'green';

interface FeaturedRaffleCardProps {
	raffle: Raffle;
	variant: FeaturedVariant;
}

const VARIANT_CONFIG = {
	blue: {
		bg: 'bg-[#e1f8ff]',
		badgeBg: 'bg-[#00b8ff]',
		badgeLabel: 'Best value',
	},
	green: {
		bg: 'bg-[#beffdb]',
		badgeBg: 'bg-[#13e36f]',
		badgeLabel: 'New this week',
	},
} as const;

/** Large card for featured raffles — vertical on mobile, horizontal on desktop. */
export function FeaturedRaffleCard({
	raffle,
	variant,
}: FeaturedRaffleCardProps) {
	const config = VARIANT_CONFIG[variant];

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

	function getTicketPrice(): string {
		const value = Number(raffle.ticketPriceAmount);
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		});
	}

	const hostName = raffle.host?.name ?? raffle.host?.username ?? 'Unknown';
	// featuredCoverUrl is optimized for featured placement; falls back to standard cover
	const heroImage = raffle.featuredCoverUrl ?? raffle.coverMediaUrl;

	return (
		<Link
			href={`/browse/${raffle.publicSlugOrCode}`}
			className={cn(
				config.bg,
				'flex h-full w-full flex-col gap-6 rounded-3xl border border-transparent p-6 transition-colors sm:flex-row sm:justify-between sm:p-8 sm:hover:border-black',
			)}
		>
			{/* Text content — flex-1 + mt-auto on the button keeps "Enter now!"
			   bottom-aligned across cards with different title lengths. */}
			<div className="flex flex-1 flex-col gap-6 sm:w-[60%]">
				<div className="flex flex-col gap-2">
					<span
						className={cn(
							config.badgeBg,
							'w-fit rounded-[10px] px-2 py-0.5 text-sm font-semibold text-[#121211]',
						)}
					>
						{config.badgeLabel}
					</span>
					<div className="flex flex-col gap-2">
						<h3 className="font-clash-display text-2xl leading-tight font-semibold tracking-[0.12px] text-[#182135]">
							{raffle.title}
						</h3>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-base text-[#121211]">by {hostName}</span>
							<span className="inline-flex items-center gap-1 rounded-[10px] border border-black px-1 py-0.5 text-xs text-[#121211]">
								<CheckCircle className="size-3.5" />
								Verified host
							</span>
						</div>
					</div>
					<p className="text-sm text-[#7b7b7b]">
						{raffle.participantsCount} participants &middot; ${getTicketPrice()}
						/ticket &middot; {getTimeRemaining()}
					</p>
				</div>
				<div className="mt-auto flex w-full items-center justify-center rounded-full bg-[#141416] px-6 py-4">
					<span className="text-base font-semibold text-[#fcfcfd]">
						Enter now!
					</span>
				</div>
			</div>

			{/* Cover image - below text on mobile, right side on desktop */}
			{heroImage ? (
				<div className="relative aspect-square w-full flex-shrink-0 self-start overflow-hidden rounded-3xl sm:w-[182px]">
					<Image
						src={heroImage}
						alt={raffle.title}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 100vw, 182px"
					/>
				</div>
			) : null}
		</Link>
	);
}
