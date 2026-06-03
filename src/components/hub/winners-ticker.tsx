import { HUB_WINNERS, type HubWinner } from './hub-content';

/**
 * Repetition count for the marquee strip. The `animate-marquee` keyframe
 * translates `-50%`, so the strip is only seamless when its first half is
 * identical to its second — i.e. the winners list must repeat an EVEN number
 * of times (here `3 + 3`). Six copies also overflow the widest supported
 * viewport so the loop never exposes a gap.
 */
const REPEAT_COUNT = 6;

/** Flattened repeats of the winners list, with a stable per-copy key. */
const TICKER_ITEMS = Array.from({ length: REPEAT_COUNT }, (_, copy) =>
	HUB_WINNERS.map(winner => ({ winner, key: `${copy}-${winner.name}` })),
).flat();

/**
 * One winner cell — name, total entries, and the entries they just won.
 *
 * @param winner - The player to render
 * @returns A single ticker cell followed by a dot separator
 */
function WinnerCell({ winner }: { readonly winner: HubWinner }) {
	return (
		<span className="flex items-center gap-2 pr-2">
			<span className="text-navy text-label-md sm:text-body-md font-semibold">
				{winner.name}
			</span>
			<span className="text-navy/70 text-label-md sm:text-body-md">
				{winner.entries} entries
			</span>
			<span className="text-status-live text-label-md sm:text-body-md font-semibold">
				+{winner.justWon} just won
			</span>
			<span className="bg-navy/40 inline-block size-1.5 rounded-full" />
		</span>
	);
}

/**
 * Winners ticker — the strip pinned beneath the hub nav. Replaces the static
 * share-promo marquee with a running feed of other members and the entries
 * they hold / just won, as live social proof.
 *
 * Pure presentational Server Component: the scroll is a CSS-only
 * `animate-marquee` loop (no hooks, no client state), so it stays
 * server-rendered and animates from first paint.
 *
 * @returns The accent-coloured running winners strip
 */
export function WinnersTicker() {
	return (
		<div className="bg-brand-yellow relative z-(--z-sticky) overflow-hidden border-b border-black">
			<div className="animate-marquee flex items-center gap-2 py-1.5 whitespace-nowrap sm:py-2">
				{TICKER_ITEMS.map(({ winner, key }) => (
					<WinnerCell key={key} winner={winner} />
				))}
			</div>
		</div>
	);
}
