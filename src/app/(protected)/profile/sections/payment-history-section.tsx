import Link from 'next/link';

import { OrderStatusBadge } from '@/components/order/status-badge';
import { Button } from '@/components/ui/button';
import { getMyOrders } from '@/services/order/get-my-orders';
import type { OrderWithRaffle } from '@/types/order';

/**
 * PaymentHistorySection Component
 *
 * Server component displaying the last 5 orders in the profile.
 * Shows "View all" link when there are more orders.
 */
export async function PaymentHistorySection() {
	// excludeStale hides abandoned/expired pending orders — profile summary
	// should only show meaningful orders (completed, recent active, etc.)
	const result = await getMyOrders({ page: 1, limit: 5, excludeStale: true });

	const orders = result.success ? result.data.items : [];

	/**
	 * Formats decimal string to currency display
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
	 */
	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	/**
	 * Renders a single order row
	 */
	function renderOrderRow(order: OrderWithRaffle) {
		return (
			<div
				key={order.id}
				className="flex flex-col gap-2 border-b border-gray-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
			>
				<div className="flex flex-col gap-1">
					<span className="font-medium">{order.raffleName}</span>
					<span className="text-muted-foreground text-sm">
						{formatDate(order.createdAt)}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span className="font-medium">
						{formatAmount(order.totalAmount, order.currency)}
					</span>
					<OrderStatusBadge status={order.status} />
				</div>
			</div>
		);
	}

	return (
		<div
			className="relative flex w-full flex-col gap-4 rounded-2xl bg-white p-8"
			id="payment-history"
		>
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Payment History</h2>
				<Link href="/profile/orders">
					<Button className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-white hover:text-black">
						View all
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
