import { cn } from '@/lib/utils';
import { WINNING_STATUS, type WinningStatus } from '@/types/winning';

/**
 * Props for WinningStatusBadge
 */
interface WinningStatusBadgeProps {
	status: WinningStatus;
	className?: string;
}

/**
 * Displays winning status with color coding
 *
 * - pending → gray
 * - awaiting_host → yellow
 * - sent → blue
 * - delivered → purple
 * - received → green
 * - disputed → red
 * - resolved → green
 */
export function WinningStatusBadge({
	status,
	className,
}: WinningStatusBadgeProps) {
	/**
	 * Returns Tailwind classes for status color
	 */
	function getStatusClasses(): string {
		switch (status) {
			case WINNING_STATUS.PENDING:
				return 'bg-gray-100 text-gray-700';
			case WINNING_STATUS.AWAITING_HOST:
				return 'bg-yellow-100 text-yellow-700';
			case WINNING_STATUS.SENT:
				return 'bg-blue-100 text-blue-700';
			case WINNING_STATUS.DELIVERED:
				return 'bg-purple-100 text-purple-700';
			case WINNING_STATUS.RECEIVED:
			case WINNING_STATUS.RESOLVED:
				return 'bg-green-100 text-green-700';
			case WINNING_STATUS.DISPUTED:
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	/**
	 * Returns display label for status
	 */
	function getStatusLabel(): string {
		switch (status) {
			case WINNING_STATUS.PENDING:
				return 'Pending';
			case WINNING_STATUS.AWAITING_HOST:
				return 'Awaiting';
			case WINNING_STATUS.SENT:
				return 'Sent';
			case WINNING_STATUS.DELIVERED:
				return 'Delivered';
			case WINNING_STATUS.RECEIVED:
				return 'Received';
			case WINNING_STATUS.DISPUTED:
				return 'Disputed';
			case WINNING_STATUS.RESOLVED:
				return 'Resolved';
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
