'use client';

import { InfoIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

import { MyTicketsRow } from '@/components/raffle/info-card/my-tickets-row';
import { RaffleProgressSection } from '@/components/raffle/info-card/progress-section';
import { TransparencySection } from '@/components/raffle/info-card/transparency-section';
import { Separator } from '@/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { formatDate } from '@/lib/utils/format/date-format';
import type { Raffle } from '@/types/raffle';
import type { TicketCode } from '@/types/ticket';

interface RaffleInfoCardProps {
	raffle: Raffle;
	myTicketCodes: TicketCode[];
	myTicketsTotal: number;
	isAuthenticated?: boolean;
	publicSlug: string;
}

/**
 * Formats the percentage fill status with up to two decimals, falling
 * back to "Unlimited" when the raffle has no participant cap.
 */
function formatFillStatus(options: {
	isUnlimited: boolean;
	fillPercent: number;
}): string {
	const { isUnlimited, fillPercent } = options;
	if (isUnlimited) return 'Unlimited';
	return `${fillPercent.toLocaleString('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})}% filled`;
}

/**
 * Participants copy — only the current count for unlimited raffles,
 * otherwise `current/max Participants`.
 */
function formatParticipants(options: {
	participantsCount: number;
	maxParticipants: number;
	isUnlimited: boolean;
}): string {
	const { participantsCount, maxParticipants, isUnlimited } = options;
	if (isUnlimited) {
		return `${participantsCount.toLocaleString()} Participants`;
	}
	return `${participantsCount.toLocaleString()}/${maxParticipants.toLocaleString()} Participants`;
}

/**
 * RaffleInfoCard — sidebar companion to the ticket purchase card. Shows
 * progress, key raffle metadata, and (for authenticated users) the
 * viewer's own entries. Decomposed into focused subcomponents per
 * domain-components rule (progress, ticket list, transparency bullets).
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
	// Progress width is a derived fractional value — Tailwind can't emit
	// a static utility for an arbitrary percent, so pass it via style.
	const progressFillStyle: CSSProperties = { width: `${fillPercent}%` };
	const fillStatus = formatFillStatus({ isUnlimited, fillPercent });
	const participantsDisplay = formatParticipants({
		participantsCount: raffle.participantsCount,
		maxParticipants: raffle.maxParticipants,
		isUnlimited,
	});
	const activePeriod = `${formatDate(raffle.startAt)} - ${formatDate(raffle.endAt)}`;
	const isBelowMinParticipants =
		raffle.minParticipants > 0 &&
		raffle.ticketsSoldCount < raffle.minParticipants;

	return (
		<div className="mt-4 rounded-3xl border border-black bg-white px-4 py-6 lg:mt-8 lg:rounded-2xl lg:p-8">
			<div className="flex flex-col gap-6">
				<div className="flex w-full items-center justify-center">
					<h2 className="text-lg font-semibold">Sweepstakes Details</h2>
				</div>

				<div className="flex flex-col gap-3">
					<RaffleProgressSection
						participantsDisplay={participantsDisplay}
						fillStatus={fillStatus}
						progressFillStyle={progressFillStyle}
					/>

					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<h3 className="text-ink-500 text-sm font-medium">
								Total entries
							</h3>
							<p className="text-sm font-medium">
								{raffle.ticketsSoldCount.toLocaleString('en-US')}
							</p>
						</div>

						<div className="flex items-center justify-between">
							<h3 className="text-ink-500 text-sm font-medium">
								Active Period
							</h3>
							<p className="text-sm font-medium">{activePeriod}</p>
						</div>
					</div>
				</div>

				<Separator className="bg-ink-300" />

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<h3 className="text-ink-500 text-sm font-medium">Declared Prize</h3>
						<p className="text-sm font-medium">
							{formatCurrency(
								raffle.declaredValueAmount,
								raffle.declaredValueCurrency,
							)}
						</p>
					</div>

					<div className="flex items-center justify-between">
						<h3 className="text-ink-500 flex items-center gap-1 text-sm font-medium">
							Min. Participants
							{isBelowMinParticipants ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<InfoIcon className="text-ink-500 size-3.5 cursor-help" />
									</TooltipTrigger>
									<TooltipContent side="top" className="max-w-56">
										If the sweepstakes ends below the minimum, winners receive a
										cash share of the revenue instead of the declared prize.
									</TooltipContent>
								</Tooltip>
							) : null}
						</h3>
						<p className="text-sm font-medium">
							{raffle.minParticipants.toLocaleString()}
						</p>
					</div>

					<div className="flex items-center justify-between">
						<h3 className="text-ink-500 text-sm font-medium">Winners</h3>
						<p className="text-sm font-medium">
							{raffle.numberOfWinners.toLocaleString()}
						</p>
					</div>
				</div>

				{isAuthenticated ? (
					<>
						<Separator className="bg-ink-300 my-4" />
						<MyTicketsRow
							myTicketCodes={myTicketCodes}
							myTicketsTotal={myTicketsTotal}
							publicSlug={publicSlug}
						/>
					</>
				) : null}

				<Separator className="bg-ink-300 my-4" />
				<TransparencySection />
			</div>
		</div>
	);
}
