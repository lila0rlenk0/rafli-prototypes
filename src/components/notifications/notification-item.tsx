'use client';

import { useRouter } from 'next/navigation';

import { getNavigationPath } from '@/components/notifications/get-navigation-path';
import { NotificationIcon } from '@/components/notifications/notification-icon';
import { NOTIFICATION_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/mixpanel-client';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils/format-time-ago';
import { useNotificationStore } from '@/providers/notification-store-provider';
import { markNotificationRead } from '@/services/notification/mark-notification-read';
import type { Notification } from '@/types/notification';

interface NotificationItemProps {
	notification: Notification;
	onClose: () => void;
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
		track(NOTIFICATION_EVENTS.TAPPED, {
			notification_type: notification.type,
		});

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
