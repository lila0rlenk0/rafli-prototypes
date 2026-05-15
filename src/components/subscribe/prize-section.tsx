import { PublicRaffleCard } from '@/components/raffle/cards/public-card';
import type { Raffle } from '@/types/raffle';

interface PrizeSectionProps {
	readonly raffles: readonly Raffle[];
	/**
	 * Number of tickets the plan's cycle funds. Renders in the section
	 * caption — Basic: 10, Starter: 25, Pro: 100 — so the marketing copy
	 * matches the tier the visitor is enrolling into.
	 */
	readonly ticketsPerCycle: number;
}

/**
 * Prize showcase below the benefits grid — reuses the browse-page
 * `PublicRaffleCard` so visual parity with /browse is guaranteed
 * (hover border, progress bar, tickets-left treatment).
 *
 * Renders nothing when the live-raffle fetch returns empty: the
 * "What you can enter today" heading would read as a broken promise
 * with no cards below it, so we collapse the entire section instead
 * of showing an empty state on a marketing surface.
 *
 * @param raffles - Live raffles to display. Passed as a prop rather
 *   than fetched inside the section — the page is the only fetch
 *   site (architecture.md: "pages fetch, domain components render").
 * @param ticketsPerCycle - Per-plan ticket count rendered in the
 *   caption beneath the heading.
 * @returns Rotated "WIN RIGHT NOW" badge, heading, and raffle grid,
 *   or `null` when no raffles are available
 */
export function PrizeSection({ raffles, ticketsPerCycle }: PrizeSectionProps) {
	if (raffles.length === 0) return null;

	return (
		<section className="flex flex-col items-center gap-10 py-16 md:gap-14 md:py-20">
			<div className="flex max-w-2xl flex-col items-center gap-3 text-center">
				{/* WIN RIGHT NOW pill — Figma rotates 5.63°. Tailwind's
				    nearest named step is `rotate-6` and the visual delta
				    is imperceptible, so we ride the named token rather
				    than shipping a custom @utility. */}
				<span className="bg-brand-yellow border-ink-900 font-clash-display text-headline-sm text-ink-alpha md:text-headline-md inline-block rotate-6 rounded-2xl border px-4 py-2 font-semibold">
					WIN RIGHT NOW
				</span>
				<h2 className="font-clash-display text-headline-lg text-ink-alpha md:text-display-md font-semibold text-balance">
					What you can enter today
				</h2>
				<p className="text-body-sm text-ink-alpha">
					Your {ticketsPerCycle} tickets work on any of these live raffles.
				</p>
			</div>

			<div className="grid w-full max-w-(--container-subscribe-benefits-row) grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
				{raffles.map(raffle => (
					<PublicRaffleCard key={raffle.id} raffle={raffle} />
				))}
			</div>
		</section>
	);
}
