import { formatCurrency } from '@/lib/utils/format-currency';
import type { Raffle } from '@/types/raffle';
import { Separator } from '../ui/separator';

interface PrizeBreakdownCardProps {
	raffle: Raffle;
	isPartialParticipation: boolean;
	/** Per-winning distribution amount — overrides raffle.perWinnerAmount when present */
	distributionAmount?: string | null;
}

/**
 * PrizeBreakdownCard Component
 *
 * Displays prize breakdown for winners on concluded raffles.
 * - Partial participation: revenue share breakdown (revenue, fee, net, per winner)
 * - Normal raffle: declared prize value + revenue/fee overview
 */
export function PrizeBreakdownCard({
	raffle,
	isPartialParticipation,
	distributionAmount,
}: PrizeBreakdownCardProps) {
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

	if (isPartialParticipation) {
		return (
			<div className="my-4 rounded-2xl border border-black bg-white p-6">
				<div className="space-y-4">
					<h2 className="text-center text-lg font-semibold">Prize Breakdown</h2>

					<div className="space-y-2">
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
					</div>

					<Separator className="bg-[#B4B4B4]" />

					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">Net Revenue</span>
							<span className="font-medium">
								{formatAmount(raffle.netRevenueAmount)}
							</span>
						</div>

						<div className="flex justify-between text-sm">
							<span className="text-[#7B7B7B]">Winners</span>
							<span className="font-medium">
								&times;{raffle.numberOfWinners}
							</span>
						</div>
					</div>

					<Separator className="bg-[#B4B4B4]" />

					<div className="rounded-lg bg-[#F9FFB5] px-4 py-3">
						<div className="flex justify-between text-sm">
							<span className="font-semibold">Your Share</span>
							<span className="font-semibold">
								{formatAmount(distributionAmount ?? raffle.perWinnerAmount)}
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="my-4 rounded-2xl border border-black bg-white p-6">
			<div className="space-y-4">
				<h2 className="text-center text-lg font-semibold">Prize Details</h2>

				<div className="rounded-lg bg-[#F9FFB5] px-4 py-3">
					<div className="flex justify-between text-sm">
						<span className="font-semibold">Prize Value</span>
						<span className="font-semibold">
							{formatCurrency(
								raffle.declaredValueAmount,
								raffle.declaredValueCurrency,
							)}
						</span>
					</div>
				</div>

				<div className="space-y-2">
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

					<div className="flex justify-between text-sm">
						<span className="text-[#7B7B7B]">Winners</span>
						<span className="font-medium">&times;{raffle.numberOfWinners}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
