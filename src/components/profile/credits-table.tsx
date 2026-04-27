import { ArrowDown, ArrowUp } from 'lucide-react';

import { cn } from '@/lib/class-names';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import {
	CREDIT_ENTRY_TYPE,
	CREDIT_REASON,
	type CreditHistoryEntry,
} from '@/types/credits';

/**
 * Props for CreditHistoryTable
 */
interface CreditHistoryTableProps {
	entries: CreditHistoryEntry[];
}

/**
 * Human-readable labels for credit reasons.
 * Maps snake_case backend values to user-friendly text.
 */
const REASON_LABELS: Record<string, string> = {
	[CREDIT_REASON.ADMIN_GRANT]: 'Admin Grant',
	[CREDIT_REASON.CANCELLATION_REFUND]: 'Cancellation Refund',
	[CREDIT_REASON.CHECKOUT_SPEND]: 'Checkout Payment',
	[CREDIT_REASON.ORDER_REVERSAL]: 'Order Reversal',
	[CREDIT_REASON.SUBSCRIPTION_RENEWAL]: 'Subscription Renewal',
};

/**
 * CreditHistoryTable Component
 *
 * Renders credit ledger entries in a table format.
 * Grant/reversal entries show green with up arrow, spends show red with down arrow.
 */
export function CreditHistoryTable({ entries }: CreditHistoryTableProps) {
	/**
	 * Formats decimal string to currency display.
	 * Credits are always USD-denominated.
	 *
	 * @returns Formatted string with +/- prefix (e.g. "+$50", "-$12.5")
	 */
	function formatAmount(entry: CreditHistoryEntry): string {
		const formatted = formatCurrency(entry.amount, 'USD');
		// Spends decrease balance, grants/reversals increase it
		return isCredit(entry) ? `+${formatted}` : `-${formatted}`;
	}

	/**
	 * Returns true if the entry increases balance (grant or reversal).
	 */
	function isCredit(entry: CreditHistoryEntry): boolean {
		return entry.type !== CREDIT_ENTRY_TYPE.SPEND;
	}

	/**
	 * Formats ISO date to readable format
	 */
	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	/**
	 * Gets human-readable label for the credit reason.
	 */
	function getReasonLabel(reason: string): string {
		return REASON_LABELS[reason] ?? reason;
	}

	if (entries.length === 0) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No credit activity yet
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-125">
				<thead>
					<tr className="border-b border-gray-200 text-left text-sm text-gray-500">
						<th className="pb-3 font-medium">Type</th>
						<th className="pb-3 font-medium">Amount</th>
						<th className="pb-3 font-medium">Balance After</th>
						<th className="pb-3 font-medium">Date</th>
					</tr>
				</thead>
				<tbody>
					{entries.map(function renderEntry(entry) {
						const credit = isCredit(entry);

						return (
							<tr
								key={entry.id}
								className="border-b border-gray-100 last:border-0"
							>
								{/* Type + reason */}
								<td className="py-4">
									<div className="flex items-center gap-2">
										{credit ? (
											<ArrowUp className="size-4 text-green-600" />
										) : (
											<ArrowDown className="size-4 text-red-500" />
										)}
										<span className="font-medium">
											{getReasonLabel(entry.reason)}
										</span>
									</div>
								</td>

								{/* Amount with color */}
								<td
									className={cn(
										'py-4 font-medium',
										credit ? 'text-green-600' : 'text-red-500',
									)}
								>
									{formatAmount(entry)}
								</td>

								{/* Balance after */}
								<td className="py-4 text-black">
									{formatCurrency(entry.balanceAfter, 'USD')}
								</td>

								{/* Date */}
								<td className="py-4 text-black">
									{formatDate(entry.createdAt)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
