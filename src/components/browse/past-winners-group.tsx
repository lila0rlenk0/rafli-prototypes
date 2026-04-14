import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { RecentWinner } from '@/types/winning';

/**
 * Accent palette variants for the group header band. Rotates across the
 * page to visually separate consecutive raffle groups — the three colors
 * are the same tokens used for DecorativeShapes in each public layout
 * (`--color-accent-*` in globals.css) so the page feels of-a-piece with
 * /browse, /how-it-works, and the landing surfaces.
 */
export type PastWinnersGroupVariant = 'blue' | 'green' | 'yellow';

interface PastWinnersGroupProps {
	raffleTitle: string;
	raffleSlug: string;
	/** ISO timestamp of the draw — same `wonAt` across all winners in the group. */
	drawnAt: string;
	winners: readonly RecentWinner[];
	variant: PastWinnersGroupVariant;
}

/**
 * Tailwind background classes keyed to the theme tokens declared in
 * globals.css (`--color-accent-blue/green/yellow`). Using tokens here
 * rather than raw hex keeps the band color in lock-step with the rest
 * of the system — if the brand ever rebalances the pastels we get the
 * update for free instead of editing three magic numbers.
 */
const ACCENT_BG: Record<PastWinnersGroupVariant, string> = {
	blue: 'bg-accent-blue',
	green: 'bg-accent-green',
	yellow: 'bg-accent-yellow',
};

/**
 * One raffle's worth of winners, presented as a grouped editorial card.
 *
 * Structure:
 * - A colored accent band owns the raffle identity (title + "Drawn · Verified"
 *   eyebrow + a "View raffle" outbound link). The color rotates per group on
 *   the parent page so scrolling the archive feels rhythmic instead of a
 *   wall of white cards.
 * - An `<ol>` of winner rows follows, each row a full-surface Link to the
 *   /verify page pre-filled with that winner's ticket code. Whole-row click
 *   target (rather than a separate button) removes visual noise and bumps
 *   the tap area well past the WCAG 44x44 minimum on mobile.
 *
 * Privacy posture: every field rendered here comes from the /winnings/recent
 * DTO, which is already PII-stripped server-side. `winnerDisplayName` arrives
 * pre-masked ("First L."), `ticketCode` is public via the verify endpoints,
 * and userId is never on the wire. Do not introduce any additional joins
 * against authenticated user data in this component.
 */
export function PastWinnersGroup({
	raffleTitle,
	raffleSlug,
	drawnAt,
	winners,
	variant,
}: PastWinnersGroupProps) {
	// Month+day+year for an editorial archive — unlike the /browse card which
	// drops year to save space, this surface IS the archive so showing the
	// year avoids ambiguity for readers scrolling through multiple years of
	// concluded raffles.
	const drawnDate = new Date(drawnAt).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});

	return (
		<article className="overflow-hidden rounded-3xl border border-transparent bg-white transition-colors duration-150 sm:hover:border-black">
			{/* Accent header band — owns raffle identity. Eyebrow text uses a
			    small-caps tracking treatment to echo editorial / masthead feel
			    without introducing a second display font. Title sits below.
			    Padding kept intentionally tight (`py-4 sm:py-5`) so each group's
			    header reads as a compact ribbon over the winner list below — a
			    thicker header made consecutive groups feel like separate pages
			    instead of entries in the same archive. */}
			<header
				className={cn(
					'flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5',
					ACCENT_BG[variant],
				)}
			>
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-[#121211]/70 uppercase sm:text-[11px]">
						<ShieldCheck aria-hidden="true" className="size-3" />
						<span>Drawn {drawnDate} · Verified on-chain</span>
					</div>
					<h2 className="font-clash-display line-clamp-2 text-lg leading-tight font-semibold text-[#121211] sm:text-xl">
						<Link
							href={`/browse/${raffleSlug}`}
							className="underline-offset-4 hover:underline"
						>
							{raffleTitle}
						</Link>
					</h2>
				</div>
				<Link
					href={`/browse/${raffleSlug}`}
					className="inline-flex flex-shrink-0 items-center gap-1 self-start rounded-full border border-black px-3 py-1 text-[11px] font-semibold text-[#121211] transition-colors hover:bg-black hover:text-white sm:self-auto"
				>
					View raffle
					<ArrowUpRight aria-hidden="true" className="size-3" />
				</Link>
			</header>

			{/* Winner rows — ordered list both semantically (positions imply rank)
			    and visually (position number as the row's dominant element). */}
			<ol className="flex flex-col">
				{winners.map(winner => (
					<li key={winner.position}>
						<Link
							/* Deep-link into the verify page with the ticket code prefilled.
							   Ticket codes are already public via /verify, so this is not
							   a new surface — it's the same flow /browse's ticket-codes
							   table uses. Query params match VerifyPageProps in
							   app/(public)/verify/page.tsx. `encodeURIComponent` future-proofs
							   against slugs or codes that ever gain non-alphanumeric chars. */
							href={`/verify?raffle=${encodeURIComponent(
								winner.raffleSlug,
							)}&code=${encodeURIComponent(winner.ticketCode)}`}
							className="group/row flex items-center gap-5 border-t border-[#eee] px-6 py-5 transition-colors first:border-t-0 hover:bg-[#f9f8f4] sm:gap-6 sm:px-8"
						>
							{/* Display-type position number — zero-padded to 2 digits so
							    "01" and "10" line up at the same x-offset in the list.
							    `tabular-nums` locks glyph widths in case the display
							    font's default is proportional. aria-hidden because the
							    adjacent prize/name text already conveys ordinal meaning;
							    screen readers don't need "zero one" read aloud. */}
							<span
								className="font-clash-display flex-shrink-0 text-4xl leading-none font-semibold text-[#121211] tabular-nums sm:text-5xl"
								aria-hidden="true"
							>
								{String(winner.position).padStart(2, '0')}
							</span>

							<div className="flex min-w-0 flex-1 flex-col">
								<span className="text-[11px] font-semibold tracking-[0.12em] text-[#7b7b7b] uppercase">
									For {winner.prizeLabel}
								</span>
								<span className="font-clash-display truncate text-xl font-semibold text-[#121211]">
									{winner.winnerDisplayName}
								</span>
								<span className="mt-0.5 truncate text-xs text-[#7b7b7b]">
									Winning ticket · {winner.ticketCode}
								</span>
							</div>

							{/* Translate-on-hover keeps the row interactive signal subtle
							    — no color change, just the arrow nudging NE as a spatial
							    affordance for the link target. */}
							<ArrowUpRight
								aria-hidden="true"
								className="size-5 flex-shrink-0 text-[#121211] transition-transform duration-150 group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5"
							/>
						</Link>
					</li>
				))}
			</ol>
		</article>
	);
}
