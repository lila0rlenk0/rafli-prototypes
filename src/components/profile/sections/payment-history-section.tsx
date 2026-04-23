import Link from 'next/link';

import { OrderStatusBadge } from '@/components/order/status-badge';
import { Button } from '@/components/ui/button';
import { getMyOrders } from '@/services/order/get-my-orders';
import type { OrderWithRaffle } from '@/types/order';

/**
 * PaymentHistorySection Component
 *
 * Server component displaying the last 5 orders in the profile.
 * Shows "View All" link when there are more orders.
 *
 * @returns Card with payment history table
 */
export async function PaymentHistorySection() {
	const result = await getMyOrders({ page: 1, limit: 5, excludeStale: true });

	const orders = result.success ? result.data.items : [];

	/**
	 * Formats decimal string to currency display
	 *
	 * @returns Formatted currency string (e.g. "$1.00")
	 */
	function formatAmount(amount: string, currency: string): string {
		const value = parseFloat(amount);
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
		}).format(value);
	}

	/**
	 * Formats ISO date to readable format
	 *
	 * @returns Formatted date string (e.g. "March 25, 2026")
	 */
	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	}

	/**
	 * Renders a single order row
	 *
	 * @returns Order row with name, date, amount, and status badge
	 */
	function renderOrderRow(order: OrderWithRaffle) {
		return (
			<div
				key={order.id}
				className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
			>
				<div className="flex flex-col gap-0.5">
					<span className="text-base font-medium">{order.raffleName}</span>
					<span className="text-muted-foreground text-sm">
						{formatDate(order.createdAt)}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-base font-medium">
						{formatAmount(order.totalAmount, order.currency)}
					</span>
					<OrderStatusBadge
						status={order.status}
						className="w-22 justify-center"
					/>
				</div>
			</div>
		);
	}

	return (
		<div
			className="relative flex w-full flex-col gap-6 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-12"
			id="payment-history"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<h3 className="font-clash-display text-headline-sm flex-1 font-semibold text-black">
					Payment History
				</h3>
				<Link href="/profile/orders">
					<Button
						variant="outline"
						size="sm"
						className="border-black text-sm font-semibold text-black/95 hover:bg-black hover:text-white"
					>
						View All
					</Button>
				</Link>
			</div>

			{orders.length === 0 ? (
				<p className="text-muted-foreground py-4 text-center text-sm">
					No orders yet
				</p>
			) : (
				<div className="flex flex-col">{orders.map(renderOrderRow)}</div>
			)}
		</div>
	);
}
