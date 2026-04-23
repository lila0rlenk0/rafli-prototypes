import { ArrowUpRight, PartyPopper } from 'lucide-react';
import Link from 'next/link';

import type { RecentWinner } from '@/types/winning';

interface RecentWinnerCardProps {
	winner: RecentWinner;
}

/**
 * Single card for the "Most recent winners!" surface.
 *
 * Privacy: `winnerDisplayName` is already pre-masked by the backend
 * ("First L." or "Deleted User"). The component never receives a userId,
 * full name, or any other PII-bearing field — render verbatim.
 *
 * The whole card links to the raffle page so visitors can see the prize
 * and verification details. Ticket-code-based deep-link to /verify is
 * intentionally not used here — the raffle page already exposes the
 * winner section + on-chain proof, and is more discoverable.
 */
export function RecentWinnerCard({ winner }: RecentWinnerCardProps) {
	// Composed once per render — no need to memoize, fmt is cheap and
	// values change only when winner prop changes (i.e., parent re-renders anyway).
	const headline = `For ${winner.prizeLabel} the winner is`;

	return (
		<Link
			href={`/browse/${winner.raffleSlug}`}
			/* `border border-transparent` seeds the border property so the
			   `sm:hover:border-black` transition has something to animate from.
			   Without it, the hover would snap abruptly and cause a 1px reflow,
			   matching the exact pattern used by PublicRaffleCard on /browse. */
			className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-transparent bg-white p-4 transition-colors duration-150 sm:p-5 sm:hover:border-black"
		>
			<div className="flex min-w-0 items-center gap-4">
				{/* Lime circle echoes the brand accent used in the decorative shapes
				    in browse/layout.tsx. Uses the `--color-brand-yellow` theme
				    token so if the brand ever retunes the pastel, this single
				    celebration surface updates alongside the rest of the system
				    — same tokenized approach PastWinnersGroup uses. */}
				{/* Icon is decorative — `aria-hidden` so SR users aren't announced
				    "party popper" before the already-descriptive "For X the winner is"
				    eyebrow text that follows. */}
				<span
					aria-hidden="true"
					className="bg-brand-yellow text-ink-900 flex size-10 flex-shrink-0 items-center justify-center rounded-full sm:size-12"
				>
					<PartyPopper className="size-5 sm:size-6" />
				</span>
				<div className="flex min-w-0 flex-col">
					<span className="text-ink-500 truncate text-xs sm:text-sm">
						{headline}
					</span>
					<span className="text-ink-900 truncate text-sm font-semibold sm:text-base">
						{winner.winnerDisplayName}
					</span>
				</div>
			</div>
			<ArrowUpRight
				aria-hidden="true"
				className="text-ink-900 size-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
			/>
		</Link>
	);
}
