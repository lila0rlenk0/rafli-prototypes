/**
 * Hub mini-games — shared vocabulary + copy.
 *
 * Maps the hub's three game cards onto the playable game kinds and centralises
 * the copy that the design transcripts were emphatic about (never say
 * "wrong"; loss screens read "Better luck next time"; the daily limiter is a
 * cosmetic "come back tomorrow" countdown in this prototype).
 *
 * The hex constants mirror the brand tokens in `globals.css`
 * (`--color-brand-*`, `--color-ink-*`). SVG presentation attributes (`fill`,
 * `stroke`) can't take Tailwind classes, so the games reference these instead
 * of hard-coding magic hex strings inline.
 */

/** A playable game behind a hub card. */
export type GameKind = 'scratch' | 'coinflip' | 'mystery';

/** Per-game lifecycle phase. */
export type GamePhase = 'idle' | 'playing' | 'win' | 'loss';

/**
 * The result a game hands back to the deck when it finishes. The deck uses
 * this to drive the post-game result modal and to advance the daily streak.
 * `award` is the credits won this round — 0 on a loss (and possible on a
 * mystery-card "win" that held an empty prize).
 */
export interface GameOutcome {
	readonly won: boolean;
	readonly award: number;
}

/**
 * Hub game id → playable kind. Ids come from `HUB_GAMES` in `hub-content.ts`;
 * the three canonical games map onto the three mechanics.
 */
export const GAME_KIND_BY_ID: Record<string, GameKind> = {
	'lucky-scratch': 'scratch',
	'double-or-nothing': 'coinflip',
	'pick-a-card': 'mystery',
};

/** Starting credit balance the modal opens with (mirrors HUB_CREDITS_COUNT). */
export const GAMES_START_CREDITS = 12;

/** Single, consistent loss headline across all three games. */
export const LOSS_TITLE = 'Better luck next time';

/** Cosmetic daily-reset countdown shown on end states (static placeholder). */
export const NEXT_FREE_PLAY = '11:34:22';

/** Brand palette as raw hex for SVG/canvas fills (mirrors design tokens). */
export const PALETTE = {
	ink: '#141416',
	inkSoft: 'rgba(20,20,22,.4)',
	muted: '#7b7b7b',
	faint: '#b4b4b4',
	surfaceMuted: '#f0eeea',
	yellow: '#f6ff8b',
	mint: '#beffdb',
	sky: '#c4edff',
	greenText: '#166534',
} as const;
