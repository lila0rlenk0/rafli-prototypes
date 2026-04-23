/**
 * Presentation helpers for the Tickets step. Pure — no React, no I/O —
 * which is why they live alongside the date helpers rather than inside a
 * component module.
 */

/**
 * Pluralizes the word "participant" based on count. Keeps the caller's JSX
 * free of inline ternaries so the copy can be tweaked in one place.
 *
 * @param count - Participant count driving pluralization.
 * @returns `"participant"` when count is 1, `"participants"` otherwise.
 */
export function formatParticipantLabel(count: number): string {
	return count === 1 ? 'participant' : 'participants';
}

/**
 * Decides whether to render the "partial draw" row in the outcome list.
 *
 * Business rule: a partial draw is only meaningful when the minimum
 * participants setting is enabled (non-zero) AND there's an actual gap
 * between the winners count and the minimum — i.e. `min - 1 > winners`.
 * Otherwise the partial-draw row would contradict the full-draw row or
 * the auto-cancel row.
 *
 * @param minParticipants - Configured minimum participants (0 = disabled).
 * @param numberOfWinners - Configured number of winners.
 * @returns `true` when the partial-draw outcome row should be shown.
 */
export function shouldShowPartialDrawCallout(
	minParticipants: number,
	numberOfWinners: number,
): boolean {
	if (minParticipants <= 0) return false;
	return minParticipants - 1 > numberOfWinners;
}
