import type { RaffleWinner } from '@/types/raffle';

interface WinnerCardProps {
	winner: RaffleWinner;
}

/**
 * WinnerCard Component
 *
 * Displays a single winner's information including their name,
 * winning ticket code, and verification link.
 */
export function WinnerCard({ winner }: WinnerCardProps) {
	/**
	 * Gets the display name for the winner
	 * @returns The winner's name or a fallback
	 */
	function getDisplayName(): string {
		return winner.name || 'Anonymous Winner';
	}

	return (
		<div className="space-y-4 rounded-2xl border border-black bg-white px-6 py-4">
			<div className="space-y-1">
				<span className="text-sm text-[#7B7B7B]">Winner</span>
				<p className="font-semibold">{getDisplayName()}</p>
				<p className="text-sm">{winner.ticketCode}</p>
			</div>
		</div>
	);
}
