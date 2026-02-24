'use client';

import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate } from '@/lib/utils/date-format';
import type { Raffle } from '@/types/raffle';
import type { TicketCode } from '@/types/ticket';
import { InfoIcon } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

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
	const isUnlimited = raffle.maxParticipants === 0;

	/**
	 * Gets the fill status text for the raffle
	 * @returns "Unlimited" for unlimited raffles, otherwise percentage string
	 */
	function getFillStatus(): string {
		if (isUnlimited) return 'Unlimited';
		return (
			(
				(raffle.participantsCount / raffle.maxParticipants) *
				100
			).toLocaleString('en-US', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 2,
			}) + '% filled'
		);
	}

	/**
	 * Gets the participants count display text
	 * @returns Only current count for unlimited, otherwise "current/max Participants"
	 */
	function getParticipantsDisplay(): string {
		if (isUnlimited) {
			return `${raffle.participantsCount.toLocaleString()} Participants`;
		}
		return `${raffle.participantsCount.toLocaleString()}/${raffle.maxParticipants.toLocaleString()} Participants`;
	}

	/**
	 * Gets the progress bar width as a percentage string
	 * @returns Percentage string for width style
	 */
	function getProgressBarWidth(): string {
		if (isUnlimited) return '0%';
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

	/**
	 * Checks if current ticket sales are below minimum participants
	 * @returns true if below minimum
	 */
	function isBelowMinParticipants(): boolean {
		return (
			raffle.minParticipants > 0 &&
			raffle.ticketsSoldCount < raffle.minParticipants
		);
	}

	/**
	 * Estimates per-winner amount if raffle ends with current sales
	 * Uses frontend estimate since backend values are null during active raffle
	 * @returns Formatted estimated per-winner amount
	 */
	function getEstimatedPerWinner(): string {
		const revenue = parseFloat(raffle.revenueAmount);
		const feePercent = parseFloat(raffle.platformFeePercent ?? '10');
		const net = revenue * (1 - feePercent / 100);
		const perWinner = net / raffle.numberOfWinners;
		return formatCurrency(perWinner, raffle.ticketPriceCurrency);
	}

	return (
		<div
			className="mt-8 rounded-2xl border border-black bg-white p-8 data-[authenticated=false]:md:w-84"
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
							<span className="text-[#7B7B7B]">{getParticipantsDisplay()}</span>
							<span className="font-medium text-[#7B7B7B]">
								{getFillStatus()}
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

				{/* Prize Pool Section */}
				<Separator className="bg-[#B4B4B4]" />

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium text-[#7B7B7B]">
							Declared Prize
						</h3>
						<p className="text-sm font-medium">
							{formatCurrency(
								raffle.declaredValueAmount,
								raffle.declaredValueCurrency,
							)}
						</p>
					</div>

					<div className="flex items-center justify-between">
						<h3 className="flex items-center gap-1 text-sm font-medium text-[#7B7B7B]">
							Min. Participants
							{isBelowMinParticipants() && (
								<Tooltip>
									<TooltipTrigger asChild>
										<InfoIcon className="size-3.5 cursor-help text-[#7B7B7B]" />
									</TooltipTrigger>
									<TooltipContent side="top" className="max-w-56">
										If the raffle ends below the minimum, winners receive a cash
										share of the revenue instead of the declared prize.
									</TooltipContent>
								</Tooltip>
							)}
						</h3>
						<p className="text-sm font-medium">
							{raffle.minParticipants.toLocaleString()}
						</p>
					</div>

					{isBelowMinParticipants() && (
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-[#7B7B7B]">
								Est. per winner
							</h3>
							<p className="text-sm font-medium">{getEstimatedPerWinner()}</p>
						</div>
					)}
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
