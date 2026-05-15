import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface LandingHeroProps {
	readonly activeCount: number;
	readonly totalPrizeValue: number;
}

interface StatChip {
	readonly label: string;
}

// Mirrors the browse hero's lifetime rewards chip verbatim so the marketing
// surface and the in-app browse hero stay in lockstep. No backend surface for
// this figure yet — it is intentionally hard-coded on both sides.
const REWARDS_DISTRIBUTED_LABEL = '50M+ Reward Assets Distributed';

/**
 * Landing hero — tagline + live stat chips + headline + sub-copy + dual CTAs.
 *
 * Server Component. Mirrors the browse hero's stat-pill pattern so the
 * marketing surface and the in-app browse hero stay in lockstep, then layers
 * the landing-specific dual CTAs ("Sign up free" / "Browse sweepstakes")
 * under the headline. The `RecentWinnersSection` (browse) is composed by the
 * page below this hero rather than nested inside, so the winners strip
 * inherits the same suspense + carousel behaviour /browse uses.
 *
 * @param activeCount - Number of live raffles, derived from the LIVE list
 * @param totalPrizeValue - Sum of declared values across the live raffles
 * @returns Hero section with chips, headline, sub-copy, and dual CTAs
 */
export function LandingHero({
	activeCount,
	totalPrizeValue,
}: LandingHeroProps) {
	const chips: readonly StatChip[] = [
		{ label: `${activeCount} active sweepstakes` },
		{
			label: `$${totalPrizeValue.toLocaleString('en-US', {
				maximumFractionDigits: 0,
			})} in prizes live now`,
		},
		{ label: REWARDS_DISTRIBUTED_LABEL },
	];

	return (
		<section className="flex flex-col gap-8 pt-2 pb-10 sm:gap-10 sm:pt-4 sm:pb-16">
			<div className="flex flex-col gap-5">
				<p className="text-ink-alpha text-sm font-medium sm:text-base">
					Real prizes. Verified draws. Enter in seconds.
				</p>

				<div className="flex flex-wrap gap-2.5">
					{chips.map(chip => (
						<span
							key={chip.label}
							className="bg-background text-ink-alpha border-brand-dark inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-sm font-medium"
						>
							<span
								aria-hidden="true"
								className="bg-green-vivid inline-block size-2 shrink-0 rounded-full"
							/>
							{chip.label}
						</span>
					))}
				</div>

				<h1 className="font-clash-display text-ink-900 text-40 sm:text-display-md/none lg:text-display-lg tracking-micro-8 max-w-screen-md font-semibold sm:tracking-normal">
					Win real prizes.
					<br />
					Every draw verified.
				</h1>

				<p className="text-ink-500 max-w-prose text-base font-medium sm:text-lg">
					Transparent, on-chain sweepstakes. Enter in seconds. Winners selected
					by Chainlink VRF — verifiable by anyone.
				</p>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Button asChild size="lg" className="h-12 px-8">
					<Link href="/sign-up">Sign up free</Link>
				</Button>
				<Button asChild size="lg" variant="outline" className="h-12 px-8">
					<Link href="/browse">Browse sweepstakes</Link>
				</Button>
			</div>
		</section>
	);
}
