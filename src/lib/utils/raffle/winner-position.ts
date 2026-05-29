/**
 * Builds the human-facing position label for a raffle winner.
 *
 * The backend stores `position` 0-indexed (the first winner is `0`), so it is
 * always rendered 1-based — a winner must never see "Position #0". Single-winner
 * raffles have no ranking to communicate, so the label is suppressed entirely.
 *
 * @param position - Backend 0-indexed winner position.
 * @param totalWinners - How many winners the raffle draws.
 * @returns `"Position #N"` (1-based) for multi-winner raffles, or `null` when
 *   the raffle has a single winner (no position to show).
 */
export function formatWinnerPosition(
	position: number,
	totalWinners: number,
): string | null {
	if (totalWinners <= 1) return null;
	return `Position #${position + 1}`;
}
