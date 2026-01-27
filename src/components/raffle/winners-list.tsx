import type { RaffleWinner } from '@/types/raffle';

import { WinnerCard } from './winner-card';

interface WinnersListProps {
	winners: RaffleWinner[];
}

/**
 * WinnersList Component
 *
 * Displays a list of winner cards for a concluded raffle.
 */
export function WinnersList({ winners }: WinnersListProps) {
	if (winners.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			{winners.map(winner => (
				<WinnerCard key={winner.id} winner={winner} />
			))}
		</div>
	);
}
