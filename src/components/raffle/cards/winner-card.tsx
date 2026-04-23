import type { RaffleWinner } from '@/types/raffle';

import { WinnerVerification } from '@/components/raffle/winners/winner-verification/winner-verification';

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
	// Backend positions are 0-indexed; +1 for human display (0 → 1st place)
	const displayName = isCurrentUser
		? 'You'
		: winner.name || `Winner #${winner.position + 1}`;

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-black bg-white px-6 py-4">
			<div className="flex flex-col gap-1">
				<p className="font-semibold">{displayName}</p>
				{winner.ticketCode ? (
					<div
						key={winner.ticketCode}
						className="flex w-fit items-center justify-center rounded-lg bg-yellow-200 p-2 text-nowrap"
					>
						<span className="text-xs">{winner.ticketCode}</span>
					</div>
				) : null}
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
