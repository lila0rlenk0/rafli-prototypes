'use client';

import { formatCurrency } from '@/lib/utils/format-currency';
import { formatDate } from '@/lib/utils/date-format';
import type { Raffle } from '@/types/raffle';
import type { TicketCode } from '@/types/ticket';
import { CheckCircle2Icon, InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

const MAX_VISIBLE_TICKETS = 5;

interface RaffleInfoCardProps {
	raffle: Raffle;
	myTicketCodes: TicketCode[];
	myTicketsTotal: number;
	isAuthenticated?: boolean;
	publicSlug: string;
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
	publicSlug,
}: RaffleInfoCardProps) {
	const isUnlimited = raffle.maxParticipants === 0;
	const fillPercent = isUnlimited
		? 0
		: (raffle.participantsCount / raffle.maxParticipants) * 100;
	const fillStatus = isUnlimited
		? 'Unlimited'
		: `${fillPercent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}% filled`;
	const participantsDisplay = isUnlimited
		? `${raffle.participantsCount.toLocaleString()} Participants`
		: `${raffle.participantsCount.toLocaleString()}/${raffle.maxParticipants.toLocaleString()} Participants`;
	const activePeriod = `${formatDate(raffle.startAt)} - ${formatDate(raffle.endAt)}`;
	const isBelowMinParticipants =
		raffle.minParticipants > 0 &&
		raffle.ticketsSoldCount < raffle.minParticipants;

	return (
		<div className="mt-4 rounded-3xl border border-black bg-white px-4 py-6 lg:mt-8 lg:rounded-2xl lg:p-8">
			<div className="space-y-6">
				{/* Title */}
				<div className="flex w-full items-center justify-center">
					<h2 className="text-lg font-semibold">Raffle Details</h2>
				</div>

				{/* Progress Section */}
				<div className="space-y-3">
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#7B7B7B]">{participantsDisplay}</span>
							<span className="font-medium text-[#7B7B7B]">{fillStatus}</span>
						</div>

						<div className="h-[11px] w-full overflow-hidden rounded-full bg-gray-100">
							<div
								className="bg-primary h-full transition-all duration-300 ease-out"
								style={{ width: `${fillPercent}%` }}
							/>
						</div>
					</div>

					<div className="space-y-2">
						{/* Total Tickets Section */}
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-[#7B7B7B]">
								Total tickets
							</h3>
							<p className="text-sm font-medium">
								{raffle.ticketsSoldCount.toLocaleString('en-US')}
							</p>
						</div>

						{/* Active Period Section */}
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-[#7B7B7B]">
								Active Period
							</h3>
							<p className="text-sm font-medium">{activePeriod}</p>
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
							{isBelowMinParticipants ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<InfoIcon className="size-3.5 cursor-help text-[#7B7B7B]" />
									</TooltipTrigger>
									<TooltipContent side="top" className="max-w-56">
										If the raffle ends below the minimum, winners receive a cash
										share of the revenue instead of the declared prize.
									</TooltipContent>
								</Tooltip>
							) : null}
						</h3>
						<p className="text-sm font-medium">
							{raffle.minParticipants.toLocaleString()}
						</p>
					</div>

					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium text-[#7B7B7B]">Winners</h3>
						<p className="text-sm font-medium">
							{raffle.numberOfWinners.toLocaleString()}
						</p>
					</div>
				</div>

				{/* My Tickets Section - Only shown for authenticated users */}
				{isAuthenticated ? (
					<>
						<Separator className="my-4 bg-[#B4B4B4]" />

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium text-[#7B7B7B]">
									My Tickets
								</h3>
								<div className="flex items-center gap-2">
									<p>{myTicketsTotal.toLocaleString('en-US')}</p>
									{myTicketsTotal > 0 ? (
										<Tooltip>
											<TooltipTrigger asChild>
												<Link
													href={`/browse/${publicSlug}/ticket-ids`}
													aria-label="View ticket codes"
												>
													<InfoIcon className="size-5 text-[#7B7B7B]" />
												</Link>
											</TooltipTrigger>
											<TooltipContent
												side="left"
												className="max-w-64 space-y-1 p-3"
											>
												<p className="mb-2 text-xs font-semibold">
													Your ticket codes
												</p>
												{myTicketCodes
													.slice(0, MAX_VISIBLE_TICKETS)
													.map(ticket => (
														<span
															key={ticket.ticketCode}
															className="mr-1 inline-block rounded bg-[#F9FFB5] px-2 py-0.5 text-xs font-medium text-black"
														>
															{ticket.ticketCode}
														</span>
													))}
												{myTicketsTotal > MAX_VISIBLE_TICKETS ? (
													<p className="mt-1 text-xs text-[#7B7B7B]">
														+{myTicketsTotal - MAX_VISIBLE_TICKETS} more
													</p>
												) : null}
											</TooltipContent>
										</Tooltip>
									) : null}
								</div>
							</div>
						</div>
					</>
				) : null}

				<Separator className="my-4 bg-[#B4B4B4]" />

				{/* Transparency Section */}
				<div className="space-y-4 text-center">
					<h3 className="font-semibold">Rafli ensures transparency by</h3>
					<div className="inline-flex flex-col gap-2 text-left">
						<div className="flex items-start gap-2">
							<CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-500" />
							<p className="text-sm">
								Selecting the winner by code, verified on-chain
							</p>
						</div>
						<div className="flex items-start gap-2">
							<CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-500" />
							<p className="text-sm">
								Auto-refunding participants if the minimum threshold isn&apos;t
								reached.
							</p>
						</div>
						<div className="flex items-start gap-2">
							<CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-500" />
							<p className="text-sm">
								Verifying host identity and previous raffles
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
