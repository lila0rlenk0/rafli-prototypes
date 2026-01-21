import { formatDate } from '@/lib/utils/date-format';
import type { Raffle } from '@/types/raffle';
import type { TicketCode } from '@/types/ticket';
import { Separator } from '../ui/separator';

interface RaffleInfoCardProps {
	raffle: Raffle;
	myTicketCodes: TicketCode[];
	myTicketsTotal: number;
	isAuthenticated?: boolean;
}

/**
 * RaffleInfoCard Component
 *
 * Displays key raffle information including:
 * - Progress bar with fill percentage and participant counts
 * - Total tickets sold
 * - Active period showing start and end dates
 * - My Tickets section with user's ticket numbers
 *
 * This component is displayed alongside the ticket purchase card
 * to provide users with a clear overview of the raffle status.
 */
export function RaffleInfoCard({
	raffle,
	myTicketCodes,
	myTicketsTotal,
	isAuthenticated = true,
}: RaffleInfoCardProps) {
	/**
	 * Calculates the fill percentage for the raffle
	 * @returns Formatted percentage string
	 */
	function calculateFillPercentage(): string {
		if (raffle.maxParticipants === 0) return '0%';
		return (
			(
				(raffle.participantsCount / raffle.maxParticipants) *
				100
			).toLocaleString('en-US', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 2,
			}) + '%'
		);
	}

	/**
	 * Gets the progress bar width as a percentage string
	 * @returns Percentage string for width style
	 */
	function getProgressBarWidth(): string {
		if (raffle.maxParticipants === 0) return '0%';
		const percentage =
			(raffle.participantsCount / raffle.maxParticipants) * 100;
		return `${percentage}%`;
	}

	/**
	 * Gets the formatted active period string
	 * @returns Period string (e.g., "Jan 16, 2026 - Feb 16, 2026")
	 */
	function getActivePeriod(): string {
		return `${formatDate(raffle.startAt)} - ${formatDate(raffle.endAt)}`;
	}

	/**
	 * Gets total tickets sold from raffle data
	 * @returns Formatted ticket count string
	 */
	function getTotalTickets(): string {
		return raffle.ticketsSoldCount.toLocaleString('en-US');
	}

	/**
	 * Gets formatted total ticket count for user
	 * @returns Formatted count string
	 */
	function getMyTotalTickets(): string {
		return myTicketsTotal.toLocaleString('en-US');
	}

	return (
		<div
			className="mt-8 rounded-2xl border border-black bg-white p-6 data-[authenticated=false]:md:w-84"
			data-authenticated={isAuthenticated}
		>
			<div className="space-y-6">
				{/* Title */}
				<div className="flex w-full items-center justify-center">
					<h2 className="text-lg font-semibold">Raffle Details</h2>
				</div>

				{/* Progress Section */}
				<div className="space-y-3">
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#7B7B7B]">
								{raffle.participantsCount.toLocaleString()}/
								{raffle.maxParticipants.toLocaleString()} Participants
							</span>
							<span className="font-medium text-[#7B7B7B]">
								{calculateFillPercentage()} filled
							</span>
						</div>

						<div className="h-[11px] w-full overflow-hidden rounded-full bg-gray-100">
							<div
								className="bg-primary h-full transition-all duration-300 ease-out"
								style={{ width: getProgressBarWidth() }}
							/>
						</div>
					</div>

					<div className="space-y-2">
						{/* Total Tickets Section */}
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-[#7B7B7B]">
								Total tickets
							</h3>
							<p className="text-sm font-medium">{getTotalTickets()}</p>
						</div>

						{/* Active Period Section */}
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-[#7B7B7B]">
								Active Period
							</h3>
							<p className="text-sm font-medium">{getActivePeriod()}</p>
						</div>
					</div>
				</div>

				{/* My Tickets Section - Only shown for authenticated users */}
				{isAuthenticated && (
					<>
						<Separator className="my-4 bg-[#B4B4B4]" />

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium text-[#7B7B7B]">
									My Tickets
								</h3>
								<p>{getMyTotalTickets()}</p>
							</div>

							<div className="grid w-full grid-cols-1 gap-2 md:w-84 md:grid-cols-2">
								{myTicketCodes.map(ticket => (
									<div
										key={ticket.ticketCode}
										className="flex items-center justify-center rounded-lg bg-[#F9FFB5] px-2 py-2 text-nowrap"
									>
										<span className="text-xs font-medium">
											{ticket.ticketCode}
										</span>
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
