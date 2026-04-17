import { cn } from '@/lib/utils';
import { getWinningStatusLabel } from '@/lib/utils/winning-status-label';
import { WINNING_STATUS, type WinningStatus } from '@/types/winning';

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
	function getStatusClasses(): string {
		switch (status) {
			case WINNING_STATUS.PENDING:
			case WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT:
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

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
				getStatusClasses(),
				className,
			)}
		>
			{getWinningStatusLabel(status)}
		</span>
	);
}
