import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/class-names';
import type { Raffle } from '@/types/raffle';

type FeaturedVariant = 'blue' | 'green';

interface FeaturedRaffleCardProps {
	raffle: Raffle;
	variant: FeaturedVariant;
}

// -- resolved against globals.css tokens:
//   sky-100 = #e1f8ff | sky-400 = #00b8ff (primary cyan, role=info badge)
//   brand-mint = #beffdb | green-vivid = #13e36f (success accent)
const VARIANT_CONFIG = {
	blue: {
		bg: 'bg-sky-100',
		badgeBg: 'bg-sky-400',
		badgeLabel: 'Best value',
	},
	green: {
		bg: 'bg-brand-mint',
		badgeBg: 'bg-green-vivid',
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
			<div className="sm:w-sidebar-fill flex flex-1 flex-col gap-6">
				<div className="flex flex-col gap-2">
					<span
						className={cn(
							config.badgeBg,
							'rounded-pill text-ink-900 w-fit px-2 py-0.5 text-sm font-semibold',
						)}
					>
						{config.badgeLabel}
					</span>
					<div className="flex flex-col gap-2">
						<h3 className="font-clash-display tracking-micro text-navy text-2xl/tight font-semibold">
							{raffle.title}
						</h3>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-ink-900 text-base">by {hostName}</span>
							<span className="rounded-pill text-ink-900 inline-flex items-center gap-1 border border-black px-1 py-0.5 text-xs">
								<CheckCircle className="size-3.5" />
								Verified host
							</span>
						</div>
					</div>
					<p className="text-ink-500 text-sm">
						{raffle.participantsCount} participants &middot; ${getTicketPrice()}
						/entry &middot; {getTimeRemaining()}
					</p>
				</div>
				<div className="bg-brand-dark mt-auto flex w-full items-center justify-center rounded-full px-6 py-4">
					<span className="text-on-dark text-base font-semibold">
						Enter now!
					</span>
				</div>
			</div>

			{/* Cover image - below text on mobile, right side on desktop */}
			{heroImage ? (
				<div className="relative aspect-square w-full flex-shrink-0 self-start overflow-hidden rounded-3xl sm:w-45.5">
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
