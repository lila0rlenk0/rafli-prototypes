import type { Raffle } from '@/types/raffle';

interface HeroSectionProps {
	raffles: Raffle[];
	totalPrizeValue: number;
}

/**
 * HeroSection Component
 *
 * Displays the browse page hero with headline, subtitle, and dynamic stat badges
 * showing active raffle count, total prize value, and reward assets distributed.
 */
export function HeroSection({ raffles, totalPrizeValue }: HeroSectionProps) {
	const activeCount = raffles.length;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4">
				<p className="text-base font-medium text-[rgba(15,15,15,0.95)]">
					Real prizes. Verified draws. Enter in seconds.
				</p>
				<h1 className="font-clash-display text-5xl font-semibold leading-none sm:text-[64px]">
					Your $1 could win!
				</h1>
			</div>
			<div className="flex flex-wrap items-center gap-4">
				<StatBadge>
					<span className="font-semibold">{activeCount} active raffles</span>
				</StatBadge>
				<StatBadge>
					<span className="font-semibold">
						${totalPrizeValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
					</span>{' '}
					in prizes live now
				</StatBadge>
				<StatBadge>
					<span className="font-semibold">50M+Reward</span> Assets Distributed
				</StatBadge>
			</div>
		</div>
	);
}

function StatBadge({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-1.5 rounded-full border border-black bg-[#f9f8f4] px-3 py-0.5 text-sm text-[rgba(15,15,15,0.95)]">
			<span className="inline-block size-2 rounded-full bg-[#13e36f]" />
			<span>{children}</span>
		</div>
	);
}
