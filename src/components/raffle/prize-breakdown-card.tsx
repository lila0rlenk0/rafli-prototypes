import { formatCurrency } from '@/lib/utils/format-currency';
import type { Raffle } from '@/types/raffle';

interface PrizeBreakdownCardProps {
	raffle: Raffle;
}

/**
 * PrizeBreakdownCard Component
 *
 * Displays prize details for winners on concluded raffles.
 * Shows declared prize value with revenue overview.
 */
export function PrizeBreakdownCard({ raffle }: PrizeBreakdownCardProps) {
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
							{formatCurrency(raffle.revenueAmount, raffle.ticketPriceCurrency)}
						</span>
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
