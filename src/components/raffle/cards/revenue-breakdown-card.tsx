import { formatCurrency } from '@/lib/utils/format/format-currency';
import type { Raffle } from '@/types/raffle';
import { Separator } from '@/components/ui/separator';

interface RevenueBreakdownCardProps {
	raffle: Raffle;
}

export function RevenueBreakdownCard({ raffle }: RevenueBreakdownCardProps) {
	// 10% platform fee — kept as named consts so the 0.9/0.1 factors are self-evident
	const revenue = parseFloat(raffle.revenueAmount);
	const estimatedFee = formatCurrency(
		revenue * 0.1,
		raffle.ticketPriceCurrency,
	);
	const estimatedHostEarnings = formatCurrency(
		revenue * 0.9,
		raffle.ticketPriceCurrency,
	);

	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<div className="flex flex-col gap-4">
				<h2 className="text-center text-lg font-semibold">Revenue Breakdown</h2>

				<div className="flex flex-col gap-2">
					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Entries Sold</span>
						<span className="font-medium">
							{raffle.ticketsSoldCount.toLocaleString()}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Total Revenue</span>
						<span className="font-medium">
							{formatCurrency(raffle.revenueAmount, raffle.ticketPriceCurrency)}
						</span>
					</div>

					<div className="flex justify-between text-sm">
						<span className="text-ink-500">Platform Fee (10%)</span>
						<span className="font-medium">-{estimatedFee}</span>
					</div>
				</div>

				<Separator className="bg-ink-300" />

				<div className="bg-brand-mint rounded-lg px-4 py-3">
					<div className="flex justify-between text-sm">
						<span className="font-semibold">Your Earnings</span>
						<span className="font-semibold">{estimatedHostEarnings}</span>
					</div>
				</div>

				<div className="flex justify-between text-sm">
					<span className="text-ink-500">Declared Prize</span>
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
