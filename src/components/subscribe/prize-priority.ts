import type { Raffle } from '@/types/raffle';

// Marketing rank — when these titles appear in the LIVE feed, they sort
// to the front of the four-card prize row regardless of trending order.
// Kept in a single module so the three /subscribe-* pages don't drift
// over time; copy changes here flip every tier in one commit.
const PRIZE_TITLE_PRIORITY = [
	'Prediction Market',
	'Actual Silver',
	'Actual Gold',
	'Kabuto PSA 10',
] as const;

/**
 * Marketing-priority re-order for the prize-showcase row. Pure data helper,
 * not composition — lives outside the page files so the three subscribe
 * landings (`/subscribe-basic`, `/subscribe-starter`, `/subscribe-pro`)
 * share the same priority list without duplicating the ranking logic.
 *
 * Non-mutating sort: `code-style.md` bans `.sort()` in favour of
 * `.toSorted()` so the input array stays untouched for any caller that
 * later reads the original order. Raffle contract guarantees a non-empty
 * `title` (Zod parse upstream), so no `?? ''` fallback is needed.
 *
 * @param raffles - Live raffles fetched by the page
 * @returns A new array with `PRIZE_TITLE_PRIORITY` titles at the front,
 *   followed by every other raffle in its original relative order
 */
export function prioritizeSubscribeRaffles(raffles: readonly Raffle[]) {
	return raffles.toSorted((a, b) => {
		const rankA = PRIZE_TITLE_PRIORITY.findIndex(title =>
			a.title.includes(title),
		);
		const rankB = PRIZE_TITLE_PRIORITY.findIndex(title =>
			b.title.includes(title),
		);
		// `findIndex` returns -1 when the title isn't in the priority list;
		// hoist those to `MAX_SAFE_INTEGER` so they sort after every ranked
		// title without flipping into negative-comparator territory.
		const normalizedRankA = rankA === -1 ? Number.MAX_SAFE_INTEGER : rankA;
		const normalizedRankB = rankB === -1 ? Number.MAX_SAFE_INTEGER : rankB;
		return normalizedRankA - normalizedRankB;
	});
}
