import Link from 'next/link';

import { getMyOrders } from '@/services/order/get-my-orders';

import { OrdersTable } from './orders-table';
import { ArrowLeft } from 'lucide-react';

/**
 * Props for OrdersPage
 */
interface OrdersPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

/**
 * OrdersPage Component
 *
 * Displays full paginated list of user's orders.
 */
export default async function OrdersPage({ searchParams }: OrdersPageProps) {
	const params = await searchParams;
	const page = params.page ? parseInt(params.page, 10) : 1;
	const limit = 10;

	const result = await getMyOrders({ page, limit });

	const orders = result.success ? result.data.items : [];
	const totalPages = result.success ? result.data.totalPages : 0;
	const currentPage = result.success ? result.data.page : 1;

	/**
	 * Generates page URL with page parameter
	 */
	function getPageUrl(pageNum: number): string {
		return `/profile/orders?page=${pageNum}`;
	}

	return (
		<div className="flex flex-col gap-6 px-4">
			<div className="flex items-center gap-4">
				<Link href="/profile" className="flex w-fit items-center gap-2">
					<ArrowLeft className="size-4" />
					<span className="font-semibold">Back to Profile</span>
				</Link>
			</div>

			<div className="rounded-2xl bg-white p-8">
				<h1 className="mb-6 text-xl font-semibold">Payment History</h1>

				<OrdersTable orders={orders} />

				{/* Pagination */}
				{totalPages > 1 ? (
					<div className="mt-6 flex items-center justify-center gap-2">
						{currentPage > 1 ? (
							<Link
								href={getPageUrl(currentPage - 1)}
								className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
							>
								Previous
							</Link>
						) : null}
						<span className="text-muted-foreground px-3 text-sm">
							Page {currentPage} of {totalPages}
						</span>
						{currentPage < totalPages ? (
							<Link
								href={getPageUrl(currentPage + 1)}
								className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
							>
								Next
							</Link>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
