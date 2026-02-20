'use client';

import { useRouter } from 'next/navigation';

import { NotificationIcon } from '@/components/notifications/notification-icon';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils/format-time-ago';
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
		// Raffle notifications - use publicSlug if available, fallback to raffleId
		case NOTIFICATION_TYPE.RAFFLE_WON:
		case NOTIFICATION_TYPE.RAFFLE_ENDING_SOON:
		case NOTIFICATION_TYPE.RAFFLE_STARTED:
		case NOTIFICATION_TYPE.RAFFLE_COMPLETED:
		case NOTIFICATION_TYPE.RAFFLE_CANCELLED:
		case NOTIFICATION_TYPE.NEW_RAFFLE_CREATED:
		case NOTIFICATION_TYPE.FULFILLMENT_STARTED:
		case NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_COMPLETED:
		case NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_HOST:
		case NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_NON_WINNER:
		case NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_WINNER:
		case NOTIFICATION_TYPE.PRIZE_CLAIM_REMINDER: {
			const slug = metadata?.publicSlug ?? metadata?.raffleId;
			return slug ? `/browse/${slug}` : null;
		}
		// Host fulfillment notifications — all route to the fulfillment page
		case NOTIFICATION_TYPE.HOST_SHIPPING_REMINDER:
		case NOTIFICATION_TYPE.HOST_DELIVERY_CONFIRMATION_REMINDER:
		case NOTIFICATION_TYPE.WINNER_CLAIMED:
		case NOTIFICATION_TYPE.DELIVERY_CONFIRMED: {
			const slug = metadata?.publicSlug ?? metadata?.raffleId;
			return slug ? `/browse/${slug}/fulfillment` : null;
		}

		// Order notifications - go to order detail in profile
		case NOTIFICATION_TYPE.ORDER_CONFIRMED:
			return metadata?.orderId ? `/profile/orders/${metadata.orderId}` : null;

		// Winnings/fulfillment notifications - go to profile (no dedicated winnings page)
		case NOTIFICATION_TYPE.PRIZE_SENT:
		case NOTIFICATION_TYPE.PRIZE_DELIVERED:
		case NOTIFICATION_TYPE.PRIZE_AUTO_CONFIRMED:
			return '/profile';

		// Dispute notifications - go to profile
		case NOTIFICATION_TYPE.DISPUTE_OPENED:
		case NOTIFICATION_TYPE.DISPUTE_RESOLVED:
			return '/profile';

		// Review notifications - go to profile
		case NOTIFICATION_TYPE.REVIEW_RECEIVED:
			return '/profile';

		default:
			return null;
	}
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
		s => s.decrementUnreadCount,
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
				'hover:bg-accent flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors',
				!notification.read && 'bg-accent/50',
			)}
		>
			<div className="mt-0.5 shrink-0">
				<NotificationIcon type={notification.type} className="size-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm leading-tight font-medium">
					{notification.title}
				</p>
				<p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
					{notification.body}
				</p>
				<p className="text-muted-foreground/70 mt-1 text-xs">
					{formatTimeAgo(notification.createdAt)}
				</p>
			</div>
			{!notification.read && (
				<div className="bg-primary mt-2 size-2 shrink-0 rounded-full" />
			)}
		</button>
	);
}
