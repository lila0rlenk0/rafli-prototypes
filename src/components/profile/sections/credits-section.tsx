import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format/format-currency';
import { getCreditBalance } from '@/services/payment/get-credit-balance';

/**
 * CreditsSection Component
 *
 * Server component displaying the user's credit balance summary.
 * Shows available balance, total earned, and total spent.
 * Links to full credit history page.
 *
 * @returns Card with credit balance overview
 */
export async function CreditsSection() {
	const result = await getCreditBalance();

	// Gracefully degrade to zeros if endpoint fails — user always sees their balance, even $0
	const availableAmount = result.success ? result.data.availableAmount : '0';
	const totalGranted = result.success ? result.data.totalGranted : '0';
	const totalSpent = result.success ? result.data.totalSpent : '0';
	// Show history link only when there's something to browse — no point linking to an empty table
	const hasHistory = parseFloat(totalGranted) > 0 || parseFloat(totalSpent) > 0;

	return (
		<div
			className="relative flex w-full flex-col gap-6 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-12"
			id="credits"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<h3 className="font-clash-display text-headline-sm flex-1 font-semibold text-black">
					Credits
				</h3>
				{hasHistory ? (
					<Link href="/profile/credits">
						<Button
							variant="outline"
							size="sm"
							className="border-black text-sm font-semibold text-black/95 hover:bg-black hover:text-white"
						>
							View History
						</Button>
					</Link>
				) : null}
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="flex flex-col gap-1">
					<span className="text-ink-400 text-sm">Available Balance</span>
					<span className="font-clash-display text-2xl font-semibold">
						{formatCurrency(availableAmount, 'USD')}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-ink-400 text-sm">Total Earned</span>
					<span className="font-clash-display text-2xl font-semibold">
						{formatCurrency(totalGranted, 'USD')}
					</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-ink-400 text-sm">Total Spent</span>
					<span className="font-clash-display text-2xl font-semibold">
						{formatCurrency(totalSpent, 'USD')}
					</span>
				</div>
			</div>
		</div>
	);
}
