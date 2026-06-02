'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { GameCard } from '../game-card';
import { type HubGame } from '../hub-content';

interface GamesTabsProps {
	readonly games: readonly HubGame[];
	/**
	 * Launch handler for a game by id. Present → subscribed (playable) cards;
	 * absent → guest (locked) cards with no play button.
	 */
	readonly onPlay?: (id: string) => void;
}

/**
 * Mobile games view — the three game cards collapsed into a tab strip so only
 * one card is on screen at a time, instead of a tall vertical stack. Tabs are
 * tap-friendly (full-width, equal columns) and self-evident, the deliberate
 * alternative to a hidden horizontal swipe. Desktop keeps the side-by-side
 * grid; this renders below the `lg` breakpoint only.
 *
 * Presentational — the credit balance and play modal stay in `GamesDeck`,
 * which passes `onPlay` down. Without `onPlay` the cards render as locked
 * guest previews.
 *
 * @param games - The hub games to tab between
 * @param onPlay - Launch a game by id (omit for the locked guest view)
 * @returns The mobile games tab strip
 */
export function GamesTabs({ games, onPlay }: GamesTabsProps) {
	const isGuest = onPlay === undefined;

	return (
		<Tabs defaultValue={games[0]?.id} className="gap-4">
			<TabsList className="grid h-auto w-full grid-cols-3 p-1">
				{games.map(game => (
					<TabsTrigger
						key={game.id}
						value={game.id}
						className="h-auto min-h-14 flex-col gap-1 py-2"
					>
						<span aria-hidden className="text-xl/none">
							{game.art}
						</span>
						<span className="w-full truncate text-xs font-semibold">
							{game.title}
						</span>
					</TabsTrigger>
				))}
			</TabsList>

			{games.map(game => (
				<TabsContent key={game.id} value={game.id}>
					<GameCard
						game={game}
						state={isGuest ? 'guest' : undefined}
						onPlay={isGuest ? undefined : () => onPlay(game.id)}
					/>
				</TabsContent>
			))}
		</Tabs>
	);
}
