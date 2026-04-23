import { formatCurrency } from '@/lib/utils/format/format-currency';
import type { Raffle } from '@/types/raffle';

interface PrizeBreakdownCardProps {
	raffle: Raffle;
}

export function PrizeBreakdownCard({ raffle }: PrizeBreakdownCardProps) {
	return (
		<div className="my-4 rounded-2xl border border-black bg-white p-6">
			<div className="flex flex-col gap-4">
				<h2 className="text-center text-lg font-semibold">Prize Details</h2>

				<div className="rounded-lg bg-yellow-200 px-4 py-3">
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

				<div className="flex flex-col gap-2">
					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Total Revenue</span>
						<span className="font-medium">
							{formatCurrency(raffle.revenueAmount, raffle.ticketPriceCurrency)}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Winners</span>
						<span className="font-medium">&times;{raffle.numberOfWinners}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
