'use client';

import { NotificationItem } from '@/components/notifications/notification-item';
import type { Notification } from '@/types/notification';

interface NotificationListProps {
	notifications: Notification[];
	onClose: () => void;
}

/**
 * Renders list of notifications or empty state
 *
 * @param notifications - Array of notifications to display
 * @param onClose - Callback to close the popover
 */
export function NotificationList({
	notifications,
	onClose,
}: NotificationListProps) {
	if (notifications.length === 0) {
		return (
			<div className="py-8 text-center text-sm text-muted-foreground">
				No notifications
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{notifications.map((notification) => (
				<NotificationItem
					key={notification.id}
					notification={notification}
					onClose={onClose}
				/>
			))}
		</div>
	);
}
