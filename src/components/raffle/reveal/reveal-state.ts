// Pure data, types, constants, and helper functions for the reveal experience.
// No JSX, no browser APIs, no 'use client' — safe to import from any layer.

import { generateUsername } from 'unique-username-generator';

import { RAFFLE_STATUS, type Raffle, type RaffleWinner } from '@/types/raffle';
import type { Winning } from '@/types/winning';

// Max visible chars on an orbital card label before `truncateOrbitLabel`
// appends an ellipsis. 8 chars + '...' fits a single line at 12px
// (`text-label-sm`) inside the cqi-sized cards on the sidebar draw card.
const ORBIT_LABEL_MAX_CHARS = 8;

// Skewed ticket-count distribution — most entrants buy 1-5, a few stack
// 10-20. Mirrors the .tmp-animations/Winner_Loser reveal Figma sample so
// the orbit reads as a real entry pool rather than "everyone bought one".
const PLACEHOLDER_TICKETS = [1, 2, 3, 5, 7, 8, 10, 12, 15, 20] as const;

// Choreography state — content-swap states driven from React; transitions ride
// CSS keyframes (motion.md: tw-animate-css, never framer-motion on celebration).
export type RevealState = 'loading' | 'revealing' | 'winner' | 'loser';

// Outcome is 'pending' while the backend is still drawing — the dialog stays in
// `loading` and the parent's polling refreshes the raffle props until the
// outcome resolves to `winner` / `loser`.
export type Outcome = 'winner' | 'loser' | 'pending';

export interface OrbitalParticipant {
	id: string;
	label: string;
	tickets: number;
}

// ─── Timing constants ────────────────────────────────────────────────────────

// 13s ≈ 1.3 full orbital rotations at the 10s/rev loading period. The
// minimum dwell guarantees the ring completes more than one loop before
// the card flip when the user lands on an already-resolved raffle, so
// the draw never reads as a single quick spin. When the backend is
// still drawing (outcome === 'pending'), the orbit keeps spinning
// indefinitely; this floor only governs the post-mount minimum.
export const LOADING_MIN_MS = 13_000;
export const REVEALING_MS = 1_200;
export const PARTICIPANT_SAMPLE_SIZE = 7;
// Matches the .tmp-animations/Winner_Loser reveal design spec — denser
// burst reads as a celebration rather than a sparse drift.
export const CONFETTI_PIECES = 50;
export const CONFETTI_SPREAD_MS = 4_000;
export const ORBIT_STAGGER_MS = 80;
// Orbit period — full 360° rotation. 10s (36°/s) keeps card text
// readable as the ring moves past; the original 6s (60°/s) was right
// at the edge of legibility for small handles. MUST equal the duration
// in `--animate-reveal-orbit-card` (globals.css). Negative phase per
// card (computed from this period and PARTICIPANT_SAMPLE_SIZE) spreads
// the cards around the ring at mount.
export const ORBIT_PERIOD_LOADING_MS = 10_000;
// Revealing-phase period — proportionally slowed (~1.8×) so the ring
// downshifts visibly when the outcome lands. Used purely for the
// 1.2s `REVEALING_MS` window, then the orbit unmounts as the terminal
// frame takes over. MUST equal the duration in
// `--animate-reveal-orbit-card-revealing` (globals.css).
export const ORBIT_PERIOD_REVEALING_MS = 18_000;

// Brand accent ramp re-used by orbital cards and confetti. Class names resolve
// to the theme palette (DESIGN.md `brand-mint / brand-sky / brand-yellow /
// brand-green`); marketing rebrands inherit automatically.
export const ACCENT_CARD_CLASSES = [
	'bg-brand-mint',
	'bg-brand-sky',
	'bg-brand-yellow',
	'bg-brand-green',
] as const;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Derives the viewing participant's outcome from raffle state.
 * Returns 'pending' while the draw is still in progress.
 *
 * @returns 'winner' | 'loser' | 'pending'
 */
export function deriveOutcome({
	raffle,
	myWinning,
	hasWinners,
}: {
	raffle: Raffle;
	myWinning: Winning | null;
	hasWinners: boolean;
}): Outcome {
	// `ended` / `fulfilling` are pre-result states in core (VRF + CAS gate).
	// Winners land on the raffle row when status flips to `completed`
	// (`fulfill-vrf.command.ts`). Until then, keep the orbit in `loading`.
	if (raffle.status !== RAFFLE_STATUS.COMPLETED || !hasWinners) {
		return 'pending';
	}
	return myWinning ? 'winner' : 'loser';
}

/**
 * Builds a fresh random sample of decorative participants for the orbital
 * ring. Each call re-rolls — server-rendered surfaces (`RaffleDrawCard`)
 * therefore show different handles on every request, and the dialog body
 * picks a new sample on each replay mount. Labels are unique within a
 * sample so the ring never repeats a handle in one orbit. Uses the same
 * `unique-username-generator` package as the auth backend, so the orbit
 * handles read in the same visual register as real auto-provisioned user
 * names. Visual stability across re-renders is handled by `OrbitalCards`
 * locking the initial sample in component state — the sample only ever
 * changes on mount.
 *
 * @returns Array of exactly PARTICIPANT_SAMPLE_SIZE participants.
 */
export function buildParticipantSample(): OrbitalParticipant[] {
	const handles = generateUniqueHandles(PARTICIPANT_SAMPLE_SIZE);
	return handles.map(function toParticipant(label, index): OrbitalParticipant {
		const ticketIndex = Math.floor(Math.random() * PLACEHOLDER_TICKETS.length);
		return {
			id: `orbit-${index}`,
			label,
			tickets: PLACEHOLDER_TICKETS[ticketIndex],
		};
	});
}

// 3 random digits + adjective + noun mirrors the auth backend's
// `generateUsername('', 3)` call so orbit handles read in the same visual
// register as real auto-provisioned user names.
const USERNAME_DIGITS = 3;
// Retry budget for the dedup loop — the underlying noun/adjective space
// is large enough that 7 unique picks land well inside this ceiling; the
// cap exists purely so a pathological collision streak can't hang the
// server-render path.
const HANDLE_DEDUP_MAX_ATTEMPTS = 100;

function generateUniqueHandles(count: number): string[] {
	const picks = new Set<string>();
	let attempts = 0;
	while (picks.size < count && attempts < HANDLE_DEDUP_MAX_ATTEMPTS) {
		picks.add(generateUsername('', USERNAME_DIGITS));
		attempts += 1;
	}
	return Array.from(picks);
}

/**
 * Trims an orbital-card label to ORBIT_LABEL_MAX_CHARS and appends '...'
 * when the original is longer. Character-count truncation (not CSS
 * `truncate`) so the cut is consistent across the variable orbit-card
 * widths — `cqi`-sized cards shrink with the container, where width-based
 * ellipsis would cut at unpredictable boundaries.
 *
 * @returns Display label fitting a single orbital card line.
 */
export function truncateOrbitLabel(label: string): string {
	if (label.length <= ORBIT_LABEL_MAX_CHARS) return `@${label}`;
	return `@${label.slice(0, ORBIT_LABEL_MAX_CHARS)}...`;
}

/**
 * Returns a display label for the first winner. Falls back to 'A lucky entrant'
 * when no winner record is present (draw still pending on initial load).
 *
 * @returns Human-readable winner label.
 */
export function resolveWinnerLabel(winner: RaffleWinner | null): string {
	if (winner === null) return 'A lucky entrant';
	const trimmed = winner.name?.trim();
	if (trimmed) return trimmed;
	return `Entry #${winner.position}`;
}

/**
 * Whether the reveal experience should gate the page for this viewer. True
 * only for a participant of a concluded raffle whose winners are already
 * selected — hosts, non-participants, cancelled raffles, and the pre-winner
 * draw window all bypass the gate. The `hasWinners` arm is load-bearing: the
 * intro promises "The winner is in!", so it must not surface while VRF is
 * still drawing (that phase keeps the page-level "Drawing winners" card).
 *
 * @returns True when the green intro / reveal gate applies.
 */
export function isRevealEligible({
	isConcluded,
	hasWinners,
	isCancelled,
	isOwner,
	isParticipant,
}: {
	isConcluded: boolean;
	hasWinners: boolean;
	isCancelled: boolean;
	isOwner: boolean;
	isParticipant: boolean;
}): boolean {
	return isConcluded && hasWinners && !isCancelled && !isOwner && isParticipant;
}

/**
 * Returns the localStorage key recording whether the viewer has already
 * seen the reveal animation for this raffle. Keyed by raffle id so the
 * seen-flag is a one-entry-per-raffle mapping that persists across sessions
 * (a returning visitor skips straight to the result).
 *
 * @returns localStorage key string.
 */
export function revealStorageKey(raffleId: string): string {
	return `raffly:reveal-seen:${raffleId}`;
}
