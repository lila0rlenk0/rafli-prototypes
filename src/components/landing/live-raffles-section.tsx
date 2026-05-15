import Link from 'next/link';
import type { ReactNode } from 'react';

interface LiveRafflesSectionProps {
	readonly children: ReactNode;
}

/**
 * "See what's up for grabs right now!" — landing showcase that surfaces the
 * top live raffles directly on the marketing page.
 *
 * Server Component. The owning page supplies the actual raffle cards so the
 * marketing surface can reuse /browse visuals without this landing-domain
 * shell importing across component domains.
 *
 * The grid mirrors /browse's 1/2/3/4 reflow at sm/lg/xl so a four-card row
 * at xl matches what a visitor sees after they tap "Browse all".
 *
 * @param children - Raffle cards composed by the owning page
 * @returns Section header + responsive raffle grid + Browse all link
 */
export function LiveRafflesSection({ children }: LiveRafflesSectionProps) {
	return (
		<section id="sweepstakes" className="flex scroll-mt-24 flex-col gap-6">
			<header className="flex flex-wrap items-end justify-between gap-3">
				<h2 className="font-clash-display tracking-micro text-ink-900 text-2xl/none font-semibold sm:text-3xl">
					See what&apos;s up for grabs right now!
				</h2>
				<Link
					href="/browse"
					className="text-ink-500 hover:text-ink-900 text-sm underline-offset-4 hover:underline"
				>
					Browse all sweepstakes
				</Link>
			</header>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{children}
			</div>
		</section>
	);
}
