import { formatCurrency } from '@/lib/utils/format-currency';
import type { Raffle } from '@/types/raffle';
import { Separator } from '../ui/separator';

interface RevenueBreakdownCardProps {
	raffle: Raffle;
	isPartialParticipation: boolean;
}

/**
 * RevenueBreakdownCard Component
 *
 * Displays revenue breakdown for hosts on concluded raffles.
 * - Partial participation: revenue split with distribution per winner
 * - Normal raffle: revenue, estimated fee, and host earnings
 */
export function RevenueBreakdownCard({
	raffle,
	isPartialParticipation,
}: RevenueBreakdownCardProps) {
	/**
	 * Formats a nullable string amount as currency
	 * @param amount - String amount or null
	 * @returns Formatted currency string or fallback
	 */
	function formatAmount(amount: string | null | undefined): string {
		if (!amount) return '-';
		return formatCurrency(amount, raffle.ticketPriceCurrency);
	}

	/**
	 * Gets the platform fee percentage display
	 * @returns Formatted fee percentage string
	 */
	function getFeePercentDisplay(): string {
		const percent = raffle.platformFeePercent ?? '10';
		return `${parseFloat(percent).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
	}

	/**
	 * Estimates the platform fee for normal raffles
	 * @returns Formatted estimated fee string
	 */
	function getEstimatedFee(): string {
		const revenue = parseFloat(raffle.revenueAmount);
		const feePercent = parseFloat(raffle.platformFeePercent ?? '10');
		return formatCurrency(
			revenue * (feePercent / 100),
			raffle.ticketPriceCurrency,
		);
	}

	/**
	 * Estimates host earnings for normal raffles
	 * @returns Formatted estimated earnings string
	 */
	function getEstimatedHostEarnings(): string {
		const revenue = parseFloat(raffle.revenueAmount);
		const feePercent = parseFloat(raffle.platformFeePercent ?? '10');
		return formatCurrency(
			revenue * (1 - feePercent / 100),
			raffle.ticketPriceCurrency,
		);
	}

	if (isPartialParticipation) {
		return (
			<div className="rounded-2xl border border-black bg-white p-6">
				<div className="space-y-4">
					<h2 className="text-center text-lg font-semibold">
						Revenue Breakdown
					</h2>

					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">Tickets Sold</span>
							<span className="font-medium">
								{raffle.ticketsSoldCount.toLocaleString()}
							</span>
						</div>

						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">Total Revenue</span>
							<span className="font-medium">
								{formatAmount(raffle.revenueAmount)}
							</span>
						</div>

						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">
								Platform Fee ({getFeePercentDisplay()})
							</span>
							<span className="font-medium">
								-{formatAmount(raffle.platformFeeAmount)}
							</span>
						</div>

						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">Net Revenue</span>
							<span className="font-medium">
								{formatAmount(raffle.netRevenueAmount)}
							</span>
						</div>
					</div>

					<Separator className="bg-[#B4B4B4]" />

					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">Winners</span>
							<span className="font-medium">
								&times;{raffle.numberOfWinners}
							</span>
						</div>

						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">Per Winner</span>
							<span className="font-medium">
								{formatAmount(raffle.perWinnerAmount)}
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<div className="space-y-4">
				<h2 className="text-center text-lg font-semibold">Revenue Breakdown</h2>

				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-[#7B7B7B]">Tickets Sold</span>
						<span className="font-medium">
							{raffle.ticketsSoldCount.toLocaleString()}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-[#7B7B7B]">Total Revenue</span>
						<span className="font-medium">
							{formatAmount(raffle.revenueAmount)}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-[#7B7B7B]">
							Platform Fee ({getFeePercentDisplay()})
						</span>
						<span className="font-medium">-{getEstimatedFee()}</span>
					</div>
				</div>

				<Separator className="bg-[#B4B4B4]" />

				<div className="rounded-lg bg-[#beffdb] px-4 py-3">
					<div className="flex justify-between text-sm">
						<span className="font-semibold">Your Earnings</span>
						<span className="font-semibold">{getEstimatedHostEarnings()}</span>
					</div>
				</div>

				<div className="flex justify-between text-sm">
					<span className="text-[#7B7B7B]">Declared Prize</span>
					<span className="font-medium">
						{formatCurrency(
							raffle.declaredValueAmount,
							raffle.declaredValueCurrency,
						)}
					</span>
				</div>
			</div>
		</div>
	);
}
