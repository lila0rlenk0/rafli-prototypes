import type { RaffleWinner } from '@/types/raffle';

import { WinnerCard } from './winner-card';

interface WinnersListProps {
	winners: RaffleWinner[];
	raffleId: string;
	totalTickets?: number;
	manifestHash?: string | null;
	commitTxHash?: string | null;
	/** Authenticated user's winner position (from /me/winnings), null if not a winner */
	currentUserWinnerPosition?: number | null;
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
	currentUserWinnerPosition,
}: WinnersListProps) {
	if (winners.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			{winners.map(winner => (
				<WinnerCard
					key={winner.position}
					winner={winner}
					raffleId={raffleId}
					totalTickets={totalTickets}
					manifestHash={manifestHash}
					commitTxHash={commitTxHash}
					isCurrentUser={winner.position === currentUserWinnerPosition}
				/>
			))}
		</div>
	);
}
