import { GameCard } from './game-card';
import { GamesDeck } from './games/games-deck';
import { GamesTabs } from './games/games-tabs';
import { HUB_GAMES, type HubMode } from './hub-content';

interface HubGamesProps {
	/** Audience mode — guest renders locked cards with no play button. */
	readonly mode?: HubMode;
}

/**
 * Games section body, responsive by audience. Subscribers get the interactive
 * `GamesDeck` (which itself tabs on mobile and grids on desktop, and owns the
 * play modal). Guests get the same cards as locked previews — tabbed on mobile
 * (one card at a time) and a three-up grid on desktop.
 *
 * @param mode - Audience mode (defaults to subscribed)
 * @returns The games section for the given audience
 */
export function HubGames({ mode = 'subscribed' }: HubGamesProps) {
	if (mode !== 'guest') {
		return <GamesDeck />;
	}

	return (
		<>
			{/* Mobile/tablet: one locked card at a time */}
			<div className="lg:hidden">
				<GamesTabs games={HUB_GAMES} />
			</div>

			{/* Desktop: all three locked cards in a row */}
			<div className="hidden gap-6 lg:grid lg:grid-cols-3">
				{HUB_GAMES.map(game => (
					<GameCard key={game.id} game={game} state="guest" />
				))}
			</div>
		</>
	);
}
