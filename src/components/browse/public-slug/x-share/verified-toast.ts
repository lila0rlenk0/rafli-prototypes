/**
 * Wire enum from the backend's `VerifyXShareResponseDto.verifyOutcome`. Drives
 * the success-toast copy so we can stay honest about which verified path the
 * user took (provable vs blind-on-fallback) — see `getVerifiedToastMessage`.
 */
export type VerifyOutcome = 'found' | 'not_found_exhausted' | 'unavailable';

/**
 * Resolves the success toast for the verified branch.
 *
 * Backend's `verifyOutcome` tells us which of the three verified paths the
 * grant took:
 *  - `found` — tweet was provably matched in X's search index. Safe to claim
 *    "we verified your post."
 *  - `unavailable` — X's API was down; granted blind to avoid stranding
 *    honest users behind infra outages.
 *  - `not_found_exhausted` — retry budget spent without a match. Today the
 *    majority because X's t.co rewriter strips `?xref=<token>` from indexed
 *    entity URLs, so honest tweets fail entity validation. Don't claim
 *    verification — surface a thank-you instead.
 *  - omitted — idempotent already-verified replay; the persisted outcome
 *    belongs to the CAS winner, not this caller. Fall back to neutral copy.
 *
 * @param ticketsGranted - How many tickets were granted in this verify call
 * @param outcome - Wire enum from the backend; `undefined` on idempotent replays
 * @returns The toast string to render
 */
export function getVerifiedToastMessage(
	ticketsGranted: number,
	outcome: VerifyOutcome | undefined,
): string {
	// Pluralize defensively — grants are usually 1 but the wording stays
	// robust if the backend ever bumps it for a campaign.
	const entryWord = ticketsGranted === 1 ? 'Bonus entry' : 'Bonus entries';
	switch (outcome) {
		case 'found':
			return `${entryWord} granted — we verified your post.`;
		case 'unavailable':
			return `${entryWord} granted — thanks for sharing!`;
		case 'not_found_exhausted':
			return `${entryWord} granted — thanks for sharing!`;
		default:
			return `${entryWord} granted! You're in the sweepstakes now.`;
	}
}
