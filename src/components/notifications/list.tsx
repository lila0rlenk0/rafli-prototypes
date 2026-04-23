'use client';

import { NotificationItem } from '@/components/notifications/item';
import type { Notification } from '@/types/notification';

interface NotificationListProps {
	notifications: Notification[];
	onClose: () => void;
}

export function NotificationList({
	notifications,
	onClose,
}: NotificationListProps) {
	if (notifications.length === 0) {
		return (
			<div className="text-muted-foreground py-8 text-center text-sm">
				No notifications
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{notifications.map(notification => (
				<NotificationItem
					key={notification.id}
					notification={notification}
					onClose={onClose}
				/>
			))}
		</div>
	);
}
