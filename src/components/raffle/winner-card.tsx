import type { RaffleWinner } from '@/types/raffle';

import { WinnerVerification } from './winner-verification';

interface WinnerCardProps {
	winner: RaffleWinner;
	raffleId: string;
	totalTickets?: number;
	manifestHash?: string | null;
	commitTxHash?: string | null;
	isCurrentUser?: boolean;
}

/**
 * WinnerCard Component
 *
 * Displays a single winner's information including their name,
 * winning ticket code, and verification details.
 */
export function WinnerCard({
	winner,
	raffleId,
	totalTickets,
	manifestHash,
	commitTxHash,
	isCurrentUser,
}: WinnerCardProps) {
	/**
	 * Gets the display name for the winner
	 * @returns "You" if current user, winner's name, or fallback
	 */
	function getDisplayName(): string {
		if (isCurrentUser) return 'You';
		return winner.name || 'Anonymous Winner';
	}

	return (
		<div className="space-y-4 rounded-2xl border border-black bg-white px-6 py-4">
			<div className="space-y-1">
				<span className="text-sm text-[#7B7B7B]">Winner</span>
				<p className="font-semibold">{getDisplayName()}</p>
				{winner.ticketCode && <p className="text-sm">{winner.ticketCode}</p>}
			</div>
			<WinnerVerification
				raffleId={raffleId}
				position={winner.position}
				totalTickets={totalTickets}
				manifestHash={manifestHash}
				commitTxHash={commitTxHash}
			/>
		</div>
	);
}
