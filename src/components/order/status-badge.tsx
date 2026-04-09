import { cn } from '@/lib/utils';
import { ORDER_STATUS, type OrderStatus } from '@/types/order';

interface OrderStatusBadgeProps {
	status: OrderStatus;
	className?: string;
}

// completed→green, pending→yellow, failed→red, refunded→gray
export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
	function getStatusClasses(): string {
		switch (status) {
			case ORDER_STATUS.COMPLETED:
				return 'bg-green-100 text-green-700';
			case ORDER_STATUS.PENDING:
				return 'bg-yellow-100 text-yellow-700';
			case ORDER_STATUS.FAILED:
				return 'bg-red-100 text-red-700';
			case ORDER_STATUS.REFUNDED:
				return 'bg-gray-100 text-gray-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getStatusLabel(): string {
		switch (status) {
			case ORDER_STATUS.COMPLETED:
				return 'Completed';
			case ORDER_STATUS.PENDING:
				return 'Pending';
			case ORDER_STATUS.FAILED:
				return 'Failed';
			case ORDER_STATUS.REFUNDED:
				return 'Refunded';
			default:
				return status;
		}
	}

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
				getStatusClasses(),
				className,
			)}
		>
			{getStatusLabel()}
		</span>
	);
}
