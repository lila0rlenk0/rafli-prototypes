import Link from 'next/link';

import { OrderStatusBadge } from '@/components/order/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils/date-format';
import type { OrderWithRaffle } from '@/types/order';

interface OrdersTableProps {
	orders: OrderWithRaffle[];
}

function formatAmount(amount: string, currency: string): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(parseFloat(amount));
}

/**
 * Orders in a responsive table with links to detail pages.
 */
export function OrdersTable({ orders }: OrdersTableProps) {
	if (orders.length === 0) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No orders yet
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[500px]">
				<thead>
					<tr className="border-b border-gray-200 text-left text-sm text-gray-500">
						<th className="pb-3 font-medium">Raffle</th>
						<th className="pb-3 font-medium">Amount</th>
						<th className="pb-3 font-medium">Status</th>
						<th className="pb-3 font-medium">Date</th>
						<th className="pb-3 text-right font-medium"></th>
					</tr>
				</thead>
				<tbody>
					{orders.map(order => (
						<tr
							key={order.id}
							className="border-b border-gray-100 last:border-0"
						>
							<td className="py-4 font-medium">{order.raffleName}</td>
							<td className="py-4 font-medium">
								{formatAmount(order.totalAmount, order.currency)}
							</td>
							<td className="py-4">
								<OrderStatusBadge status={order.status} />
							</td>
							<td className="py-4 text-black">{formatDate(order.createdAt)}</td>
							<td className="py-4 text-right">
								<Link href={`/profile/orders/${order.id}`}>
									<Button className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-white hover:text-black">
										View
									</Button>
								</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
