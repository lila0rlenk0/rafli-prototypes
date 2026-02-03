'use client';

import { useRouter } from 'next/navigation';

import { NotificationIcon } from '@/components/notifications/notification-icon';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/providers/notification-store-provider';
import { markNotificationRead } from '@/services/notification/mark-notification-read';
import { NOTIFICATION_TYPE, type Notification } from '@/types/notification';

interface NotificationItemProps {
	notification: Notification;
	onClose: () => void;
}

/**
 * Gets navigation path based on notification type and metadata
 *
 * @param notification - The notification object
 * @returns Path to navigate to, or null if no navigation
 */
function getNavigationPath(notification: Notification): string | null {
	const { type, metadata } = notification;

	switch (type) {
		case NOTIFICATION_TYPE.RAFFLE_WON:
		case NOTIFICATION_TYPE.RAFFLE_ENDING_SOON:
		case NOTIFICATION_TYPE.RAFFLE_STARTED:
		case NOTIFICATION_TYPE.RAFFLE_COMPLETED:
		case NOTIFICATION_TYPE.RAFFLE_CANCELLED:
		case NOTIFICATION_TYPE.NEW_RAFFLE_CREATED:
			return metadata?.raffleId ? `/raffle/${metadata.raffleId}` : null;

		case NOTIFICATION_TYPE.ORDER_CONFIRMED:
			return metadata?.orderId ? `/orders/${metadata.orderId}` : null;

		case NOTIFICATION_TYPE.PRIZE_SENT:
		case NOTIFICATION_TYPE.PRIZE_DELIVERED:
		case NOTIFICATION_TYPE.PRIZE_AUTO_CONFIRMED:
		case NOTIFICATION_TYPE.DELIVERY_CONFIRMED:
		case NOTIFICATION_TYPE.WINNER_CLAIMED:
			return metadata?.winningId ? `/winnings/${metadata.winningId}` : null;

		case NOTIFICATION_TYPE.REVIEW_RECEIVED:
			return '/profile';

		default:
			return null;
	}
}

/**
 * Formats relative time from date string
 *
 * @param dateString - ISO date string
 * @returns Formatted relative time
 */
function formatTimeAgo(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

/**
 * Renders a single notification item
 *
 * @param notification - The notification to display
 * @param onClose - Callback to close the popover
 */
export function NotificationItem({
	notification,
	onClose,
}: NotificationItemProps) {
	const router = useRouter();
	const decrementUnreadCount = useNotificationStore(
		(s) => s.decrementUnreadCount,
	);

	/**
	 * Handles click on notification
	 * Marks as read (optimistic) and navigates if applicable
	 */
	async function handleClick() {
		// Optimistic update
		if (!notification.read) {
			decrementUnreadCount();
			// Fire and forget - don't block navigation
			markNotificationRead(notification.id);
		}

		const path = getNavigationPath(notification);
		if (path) {
			router.push(path);
		}
		onClose();
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				'flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors hover:bg-accent',
				!notification.read && 'bg-accent/50',
			)}
		>
			<div className="mt-0.5 shrink-0">
				<NotificationIcon type={notification.type} className="size-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium leading-tight">{notification.title}</p>
				<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
					{notification.body}
				</p>
				<p className="mt-1 text-xs text-muted-foreground/70">
					{formatTimeAgo(notification.createdAt)}
				</p>
			</div>
			{!notification.read && (
				<div className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
			)}
		</button>
	);
}
