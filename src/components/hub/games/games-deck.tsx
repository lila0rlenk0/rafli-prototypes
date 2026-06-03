'use client';

import { useState } from 'react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';

import { cn } from '@/lib/class-names';

import { GameCard } from '../game-card';
import {
	type Accent,
	HUB_GAMES,
	type HubGame,
	STREAK_FINALE_CREDITS,
	STREAK_LENGTH,
	STREAK_MILESTONES,
} from '../hub-content';
import { CoinFlipGame } from './coin-flip-game';
import {
	GAME_KIND_BY_ID,
	GAMES_START_CREDITS,
	type GameOutcome,
} from './games-content';
import { GamesTabs } from './games-tabs';
import { MysteryCardsGame } from './mystery-cards-game';
import { GameResultDialog, StreakCompleteDialog } from './post-game-dialogs';
import { ScratchGame } from './scratch-game';

interface ActiveGameProps {
	readonly game: HubGame;
	readonly credits: number;
	readonly setCredits: React.Dispatch<React.SetStateAction<number>>;
	readonly onComplete: (outcome: GameOutcome) => void;
	readonly onClose: () => void;
}

/**
 * Renders the playable game matching the launched hub card. The credit
 * balance is lifted here so wins/losses persist across games within a
 * session, and `onComplete` reports the resolved outcome back to the deck so
 * it can run the result + streak modals.
 *
 * @returns The active game screen, or null for an unmapped id
 */
function ActiveGame({
	game,
	credits,
	setCredits,
	onComplete,
	onClose,
}: ActiveGameProps) {
	const kind = GAME_KIND_BY_ID[game.id];
	switch (kind) {
		case 'scratch':
			return (
				<ScratchGame
					credits={credits}
					setCredits={setCredits}
					onComplete={onComplete}
					onClose={onClose}
				/>
			);
		case 'coinflip':
			return (
				<CoinFlipGame
					credits={credits}
					setCredits={setCredits}
					onComplete={onComplete}
					onClose={onClose}
				/>
			);
		case 'mystery':
			return (
				<MysteryCardsGame
					credits={credits}
					setCredits={setCredits}
					onComplete={onComplete}
					onClose={onClose}
				/>
			);
		default:
			return null;
	}
}

/** Bright per-game surface — the open game's accent floods the whole modal. */
const GAME_SURFACE_BG: Record<Accent, string> = {
	yellow: 'bg-brand-yellow',
	mint: 'bg-brand-mint',
	sky: 'bg-brand-sky',
};

/** A resolved game outcome paired with the title of the game that produced it. */
interface PendingResult {
	readonly outcome: GameOutcome;
	readonly gameTitle: string;
}

/**
 * The subscribed hub's games grid, made playable. Each card's CTA opens its
 * game inside a shared neo-brutalist modal; a single lifted credit balance is
 * threaded through every game so a win in one carries into the next.
 *
 * Finishing a game runs a two-step post-game flow: a result modal summarising
 * the win, then a daily-streak completion modal. Each completed game advances
 * the session streak one day (1 → 7), so the milestone copy walks from "Good
 * start." to the day-7 finale that banks the bonus credits.
 *
 * This is the interactive boundary for the games section — the cards
 * themselves stay presentational (`GameCard`), and only the launch + modal
 * orchestration lives client-side.
 *
 * @returns The interactive games deck
 */
export function GamesDeck() {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [credits, setCredits] = useState(GAMES_START_CREDITS);
	// Result modal payload — set when a game resolves, cleared on continue.
	const [pendingResult, setPendingResult] = useState<PendingResult | null>(
		null,
	);
	// Streak modal visibility, and how many streak days are already complete.
	const [streakOpen, setStreakOpen] = useState(false);
	const [completedDays, setCompletedDays] = useState(0);

	const activeGame = activeId
		? (HUB_GAMES.find(game => game.id === activeId) ?? null)
		: null;

	// The day the next completion celebrates — clamped to the finale on day 7.
	const currentDay = Math.min(completedDays + 1, STREAK_LENGTH);
	const currentMilestone = STREAK_MILESTONES[currentDay - 1];

	function handleClose() {
		setActiveId(null);
	}

	// A game resolved: close it and surface the result modal with its outcome.
	function handleGameComplete(outcome: GameOutcome) {
		if (activeGame) {
			setPendingResult({ outcome, gameTitle: activeGame.title });
		}
		setActiveId(null);
	}

	// Result modal dismissed → hand off to the streak-completion modal.
	function handleResultContinue() {
		setPendingResult(null);
		setStreakOpen(true);
	}

	// Streak modal dismissed → bank the finale bonus and advance the streak day.
	function handleStreakDone() {
		if (currentMilestone.isFinale) {
			setCredits(c => c + STREAK_FINALE_CREDITS);
		}
		setCompletedDays(currentDay);
		setStreakOpen(false);
	}

	return (
		<>
			{/* Mobile/tablet: one card at a time via tabs — keeps the page short */}
			<div className="lg:hidden">
				<GamesTabs games={HUB_GAMES} onPlay={setActiveId} />
			</div>

			{/* Desktop: all three cards in a row */}
			<div className="hidden gap-6 lg:grid lg:grid-cols-3">
				{HUB_GAMES.map(game => (
					<GameCard
						key={game.id}
						game={game}
						onPlay={() => setActiveId(game.id)}
					/>
				))}
			</div>

			<Dialog
				open={activeGame !== null}
				onOpenChange={nextOpen => {
					if (!nextOpen) {
						handleClose();
					}
				}}
			>
				<DialogContent
					showCloseButton={false}
					className={cn(
						'max-w-game-square border-brand-dark gap-0 overflow-hidden border-2 p-0 max-sm:border-0 sm:aspect-square sm:rounded-2xl',
						activeGame ? GAME_SURFACE_BG[activeGame.accent] : 'bg-white',
					)}
				>
					{activeGame ? (
						<>
							{/* Visible headings live inside each game; these satisfy the
							    Dialog's a11y contract without duplicating chrome. */}
							<DialogTitle className="sr-only">{activeGame.title}</DialogTitle>
							<DialogDescription className="sr-only">
								Play {activeGame.title} to win Rafli credits.
							</DialogDescription>
							<ActiveGame
								game={activeGame}
								credits={credits}
								setCredits={setCredits}
								onComplete={handleGameComplete}
								onClose={handleClose}
							/>
						</>
					) : null}
				</DialogContent>
			</Dialog>

			<GameResultDialog
				outcome={pendingResult?.outcome ?? null}
				gameTitle={pendingResult?.gameTitle ?? ''}
				onContinue={handleResultContinue}
			/>

			<StreakCompleteDialog
				milestone={streakOpen ? currentMilestone : null}
				onDone={handleStreakDone}
			/>
		</>
	);
}
