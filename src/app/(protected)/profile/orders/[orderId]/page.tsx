import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { OrderStatusBadge } from '@/components/order/status-badge';
import { getOrder } from '@/services/order/get-order';

/**
 * Props for OrderDetailPage
 */
interface OrderDetailPageProps {
	params: Promise<{
		orderId: string;
	}>;
}

/**
 * OrderDetailPage Component
 *
 * Displays detailed information about a single order.
 */
export default async function OrderDetailPage({
	params,
}: OrderDetailPageProps) {
	const { orderId } = await params;
	const result = await getOrder(orderId);

	if (!result.success) {
		return (
			<div className="flex flex-col gap-6 px-4">
				<div className="flex items-center gap-4">
					<Link
						href="/profile/orders"
						className="flex w-fit items-center gap-2"
					>
						<ArrowLeft className="size-4" />
						<span className="font-semibold">Back to Orders</span>
					</Link>
				</div>
				<div className="rounded-2xl bg-white p-8">
					<p className="text-muted-foreground text-center">Order not found</p>
				</div>
			</div>
		);
	}

	const order = result.data;

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
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	return (
		<div className="flex flex-col gap-6 px-4">
			<div className="flex items-center gap-4">
				<Link href="/profile/orders" className="flex w-fit items-center gap-2">
					<ArrowLeft className="size-4" />
					<span className="font-semibold">Back to Orders</span>
				</Link>
			</div>

			<div className="rounded-2xl bg-white p-8">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-xl font-semibold">Order Details</h1>
					<OrderStatusBadge status={order.status} />
				</div>

				<div className="grid gap-6 sm:grid-cols-2">
					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground text-sm">Raffle</span>
						<Link
							href={`/browse/${order.raffleSlug ?? order.raffleId}`}
							className="flex items-center gap-2 text-black hover:underline"
						>
							<span className="font-medium">{order.raffleName}</span>
							<ExternalLink className="h-4 w-4" />
						</Link>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground text-sm">Tickets</span>
						<span className="font-medium">{order.ticketQuantity}</span>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground text-sm">Unit Price</span>
						<span className="font-medium">
							{formatAmount(order.unitPrice, order.currency)}
						</span>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground text-sm">Total Amount</span>
						<span className="text-lg font-semibold">
							{formatAmount(order.totalAmount, order.currency)}
						</span>
					</div>

					{order.promoCode ? (
						<div className="flex flex-col gap-1">
							<span className="text-muted-foreground text-sm">Promo Code</span>
							<span className="font-medium">{order.promoCode}</span>
						</div>
					) : null}

					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground text-sm">Date</span>
						<span className="font-medium">{formatDate(order.createdAt)}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
