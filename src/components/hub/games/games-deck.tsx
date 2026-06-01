'use client';

import { useState } from 'react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';

import { GameCard } from '../game-card';
import { HUB_GAMES, type HubGame } from '../hub-content';
import { CoinFlipGame } from './coin-flip-game';
import { GAME_KIND_BY_ID, GAMES_START_CREDITS } from './games-content';
import { MysteryCardsGame } from './mystery-cards-game';
import { ScratchGame } from './scratch-game';

interface ActiveGameProps {
	readonly game: HubGame;
	readonly credits: number;
	readonly setCredits: React.Dispatch<React.SetStateAction<number>>;
	readonly onClose: () => void;
}

/**
 * Renders the playable game matching the launched hub card. The credit
 * balance is lifted here so wins/losses persist across games within a
 * session.
 *
 * @returns The active game screen, or null for an unmapped id
 */
function ActiveGame({ game, credits, setCredits, onClose }: ActiveGameProps) {
	const kind = GAME_KIND_BY_ID[game.id];
	switch (kind) {
		case 'scratch':
			return (
				<ScratchGame
					credits={credits}
					setCredits={setCredits}
					onClose={onClose}
				/>
			);
		case 'coinflip':
			return (
				<CoinFlipGame
					credits={credits}
					setCredits={setCredits}
					onClose={onClose}
				/>
			);
		case 'mystery':
			return (
				<MysteryCardsGame
					credits={credits}
					setCredits={setCredits}
					onClose={onClose}
				/>
			);
		default:
			return null;
	}
}

/**
 * The subscribed hub's games grid, made playable. Each card's CTA opens its
 * game inside a shared neo-brutalist modal; a single lifted credit balance is
 * threaded through every game so a win in one carries into the next.
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

	const activeGame = activeId
		? (HUB_GAMES.find(game => game.id === activeId) ?? null)
		: null;

	const close = () => setActiveId(null);

	return (
		<>
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
						close();
					}
				}}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-game-modal border-brand-dark gap-0 overflow-hidden border-2 bg-white p-0 max-sm:border-0 sm:rounded-2xl"
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
								onClose={close}
							/>
						</>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
