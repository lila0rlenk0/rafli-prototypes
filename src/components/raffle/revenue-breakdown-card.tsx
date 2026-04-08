import { formatCurrency } from '@/lib/utils/format-currency';
import type { Raffle } from '@/types/raffle';
import { Separator } from '../ui/separator';

interface RevenueBreakdownCardProps {
	raffle: Raffle;
}

/**
 * RevenueBreakdownCard Component
 *
 * Displays revenue breakdown for hosts on concluded raffles.
 * Shows tickets sold, total revenue, estimated fee, and host earnings.
 */
export function RevenueBreakdownCard({ raffle }: RevenueBreakdownCardProps) {
	/**
	 * Estimates host earnings (revenue minus 10% platform fee)
	 * @returns Formatted estimated earnings string
	 */
	function getEstimatedHostEarnings(): string {
		const revenue = parseFloat(raffle.revenueAmount);
		return formatCurrency(revenue * 0.9, raffle.ticketPriceCurrency);
	}

	/**
	 * Estimates the platform fee (10% of revenue)
	 * @returns Formatted estimated fee string
	 */
	function getEstimatedFee(): string {
		const revenue = parseFloat(raffle.revenueAmount);
		return formatCurrency(revenue * 0.1, raffle.ticketPriceCurrency);
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
							{formatCurrency(raffle.revenueAmount, raffle.ticketPriceCurrency)}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-[#7B7B7B]">Platform Fee (10%)</span>
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
