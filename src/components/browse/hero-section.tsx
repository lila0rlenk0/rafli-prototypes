import type { Raffle } from '@/types/raffle';

interface HeroSectionProps {
	raffles: Raffle[];
	totalPrizeValue: number;
}

export function HeroSection({ raffles, totalPrizeValue }: HeroSectionProps) {
	const activeCount = raffles.length;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4">
				<p className="text-ink-alpha text-sm font-normal sm:text-base sm:font-medium">
					Real prizes. Verified draws. Enter in seconds.
				</p>
				<h1 className="font-clash-display sm:text-display-md/none text-40 tracking-micro-8 font-semibold sm:tracking-normal">
					Your $1 could win!
				</h1>
			</div>
			<div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
				<StatBadge>
					<span className="font-semibold">
						{activeCount} active sweepstakes
					</span>
				</StatBadge>
				<StatBadge>
					<span className="font-semibold">
						$
						{totalPrizeValue.toLocaleString('en-US', {
							maximumFractionDigits: 0,
						})}
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
		<div className="bg-background text-ink-alpha flex items-center gap-1.5 rounded-full border border-black px-3 py-0.5 text-sm">
			<span className="bg-green-vivid inline-block size-2 rounded-full" />
			<span>{children}</span>
		</div>
	);
}
