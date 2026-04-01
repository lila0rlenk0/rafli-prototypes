import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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

/**
 * FeaturedRaffleCard Component
 *
 * Large horizontal card for promoted/featured raffles on the browse page.
 * Displays with a colored background (blue or green variant), badge, prize info,
 * host details, stats, CTA button, and a product image.
 */
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

	const hostName = raffle.host?.name || raffle.host?.username || 'Unknown';

	return (
		<Link
			href={`/browse/${raffle.publicSlugOrCode}`}
			className={`${config.bg} flex w-full items-start justify-between rounded-3xl border border-black p-6 sm:p-8 transition-shadow hover:shadow-lg`}
		>
			<div className="flex flex-col gap-6 max-w-[60%]">
				<div className="flex flex-col gap-2">
					<span
						className={`${config.badgeBg} w-fit rounded-[10px] px-2 py-0.5 text-sm font-semibold text-[#121211]`}
					>
						{config.badgeLabel}
					</span>
					<div className="flex flex-col gap-2">
						<h3 className="font-clash-display text-xl font-semibold leading-tight tracking-[0.12px] text-[#182135] sm:text-2xl">
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
						{raffle.participantsCount} participants &middot; $
						{getTicketPrice()}/ticket &middot; {getTimeRemaining()}
					</p>
				</div>
				<div className="bg-[#141416] flex w-full items-center justify-center rounded-full px-6 py-4">
					<span className="text-base font-semibold text-[#fcfcfd]">
						Enter now!
					</span>
				</div>
			</div>
			{raffle.coverMediaUrl && (
				<div className="relative hidden size-[140px] flex-shrink-0 overflow-hidden rounded-3xl sm:block sm:size-[182px]">
					<Image
						src={raffle.coverMediaUrl}
						alt={raffle.title}
						fill
						className="object-cover"
						sizes="182px"
					/>
				</div>
			)}
		</Link>
	);
}
