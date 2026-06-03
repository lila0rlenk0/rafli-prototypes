import { Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import { GAME_KIND_BY_ID } from './games/games-content';
import { GamePreview } from './games/game-preview';
import {
	type Accent,
	type GameCardState,
	GUEST_COPY,
	type HubGame,
} from './hub-content';

/** Accent → solid art-panel background behind the animated preview. */
const ART_BG: Record<Accent, string> = {
	yellow: 'bg-brand-yellow',
	mint: 'bg-brand-mint',
	sky: 'bg-brand-sky',
};

/** Pill tone presets keyed by intent. */
const PILL_TONE = {
	free: 'bg-brand-mint text-ink-900',
	paid: 'bg-black/5 text-ink-700',
	warning: 'bg-destructive/10 text-destructive',
	locked: 'bg-brand-dark text-white',
	earned: 'bg-brand-mint text-ink-900',
} as const;

interface StateDisplay {
	readonly eyebrow: string;
	readonly pill: string;
	readonly pillTone: keyof typeof PILL_TONE;
	readonly cta: string;
	readonly ctaVariant: 'default' | 'outline' | 'secondary';
	readonly ctaDisabled: boolean;
	/** Optional overlay badge rendered over the art panel. */
	readonly overlay?: { label: string; locked?: boolean };
	/** Optional small note replacing the body copy (e.g. reset timer). */
	readonly note?: string;
}

/**
 * Resolves the per-state presentation for a game card. Centralising this here
 * keeps the JSX flat and makes the five gallery states auditable in one place.
 *
 * @param game - Source game content
 * @param state - Lifecycle state to render
 * @returns The display config for the given state
 */
function resolveDisplay(game: HubGame, state: GameCardState): StateDisplay {
	switch (state) {
		case 'available-free':
			return {
				eyebrow: game.eyebrow,
				pill: game.pill,
				pillTone: 'free',
				cta: game.cta,
				ctaVariant: 'default',
				ctaDisabled: false,
			};
		case 'available-paid':
			return {
				eyebrow: game.eyebrow,
				pill: game.pill,
				pillTone: 'paid',
				cta: game.cta,
				ctaVariant: 'default',
				ctaDisabled: false,
			};
		case 'played':
			return {
				eyebrow: game.eyebrow,
				pill: '+3 credits',
				pillTone: 'earned',
				cta: 'Played',
				ctaVariant: 'secondary',
				ctaDisabled: true,
				overlay: { label: '✓ PLAYED' },
				note: 'Nice. Resets in 8h 42m.',
			};
		case 'out-of-credits':
			return {
				eyebrow: 'NEEDS CREDITS',
				pill: 'You have 0',
				pillTone: 'warning',
				cta: 'Get credits',
				ctaVariant: 'outline',
				ctaDisabled: false,
				note: 'Top up to keep playing this one.',
			};
		case 'locked-unsubscribed':
			return {
				eyebrow: 'MEMBERS ONLY',
				pill: 'PRO required',
				pillTone: 'locked',
				cta: 'Start membership',
				ctaVariant: 'default',
				ctaDisabled: false,
				overlay: { label: 'LOCKED', locked: true },
				note: 'Become a member to unlock this game.',
			};
		case 'guest':
			// Keep the wireframe + perk pill so the visitor still sees the
			// value; drop the play action for a log-in prompt.
			return {
				eyebrow: game.eyebrow,
				pill: game.pill,
				pillTone: game.state === 'available-free' ? 'free' : 'paid',
				cta: GUEST_COPY.gameCta,
				ctaVariant: 'outline',
				ctaDisabled: false,
				overlay: { label: 'Locked', locked: true },
			};
	}
}

interface GameCardProps {
	readonly game: HubGame;
	/** Overrides the game's canonical state — drives the gallery variants. */
	readonly state?: GameCardState;
	/**
	 * When supplied, the CTA becomes an active trigger that launches the game
	 * (the subscribed hub wires this to open the play modal). Omitted on the
	 * static guest/gallery renders, where the CTA stays presentational.
	 */
	readonly onPlay?: () => void;
}

/**
 * Daily game card — art panel, copy stack, and a pill + CTA footer. Supports
 * all five Figma gallery states via the `state` prop; defaults to the game's
 * canonical state. Pass `onPlay` to make the CTA launch the playable game.
 *
 * @param game - Game content (title, copy, accent, art emoji)
 * @param state - Optional lifecycle-state override
 * @param onPlay - Optional launch handler wired to the CTA
 * @returns A single game card
 */
export function GameCard({ game, state = game.state, onPlay }: GameCardProps) {
	const display = resolveDisplay(game, state);
	const dimmed = state === 'locked-unsubscribed';
	const kind = GAME_KIND_BY_ID[game.id];

	return (
		<article className="hg-card-lift border-brand-dark flex flex-col overflow-hidden rounded-2xl border-2 bg-white">
			{/* Art panel — animated game preview matching the selection screen */}
			<div
				className={cn(
					'relative flex h-44 items-center justify-center overflow-hidden',
					ART_BG[game.accent],
				)}
			>
				{kind ? (
					<div
						className={cn('absolute inset-0', dimmed && 'opacity-40 blur-sm')}
					>
						<GamePreview kind={kind} />
					</div>
				) : (
					<span
						aria-hidden
						className={cn('text-5xl', dimmed && 'opacity-40 blur-sm')}
					>
						{game.art}
					</span>
				)}
				{display.overlay ? (
					<span className="bg-brand-dark absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white">
						{display.overlay.locked ? <Lock className="size-3" /> : null}
						{display.overlay.label}
					</span>
				) : null}
			</div>

			{/* Body */}
			<div className="flex flex-1 flex-col gap-2 p-5">
				<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
					{display.eyebrow}
				</p>
				<h3 className="font-clash-display text-ink-900 text-2xl font-semibold sm:text-3xl">
					{game.title}
				</h3>
				<p className="text-ink-700 text-body-sm font-medium">{game.tagline}</p>
				<p className="text-ink-500 text-body-sm">{display.note ?? game.body}</p>

				{/* Footer — big full-width CTA with the perk pill above it */}
				<div className="mt-auto flex flex-col gap-3 pt-4">
					<span
						className={cn(
							'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold',
							PILL_TONE[display.pillTone],
						)}
					>
						{display.pill}
					</span>
					<Button
						type="button"
						size="lg"
						className="h-14 w-full text-base"
						variant={display.ctaVariant}
						disabled={display.ctaDisabled}
						onClick={onPlay}
					>
						{display.cta}
					</Button>
				</div>
			</div>
		</article>
	);
}
