import type { RaffleWinner } from '@/types/raffle';

import { WinnerCard } from './winner-card';

interface WinnersListProps {
	winners: RaffleWinner[];
	raffleId: string;
	totalTickets?: number;
	manifestHash?: string | null;
	commitTxHash?: string | null;
	currentUserId?: string | null;
}

/**
 * WinnersList Component
 *
 * Displays a list of winner cards for a concluded raffle.
 */
export function WinnersList({
	winners,
	raffleId,
	totalTickets,
	manifestHash,
	commitTxHash,
	currentUserId,
}: WinnersListProps) {
	if (winners.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			{winners.map(winner => (
				<WinnerCard
					key={winner.id}
					winner={winner}
					raffleId={raffleId}
					totalTickets={totalTickets}
					manifestHash={manifestHash}
					commitTxHash={commitTxHash}
					isCurrentUser={winner.userId === currentUserId}
				/>
			))}
		</div>
	);
}
