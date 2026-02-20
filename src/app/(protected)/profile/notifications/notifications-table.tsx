'use client';

import { useState } from 'react';

import { NotificationIcon } from '@/components/notifications/notification-icon';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils/format-time-ago';
import { useNotificationStore } from '@/providers/notification-store-provider';
import { markNotificationRead } from '@/services/notification/mark-notification-read';
import type { Notification } from '@/types/notification';

interface NotificationsTableProps {
	notifications: Notification[];
}

/**
 * Table displaying notifications with mark-as-read on click
 *
 * @param notifications - Array of notifications to display
 */
export function NotificationsTable({ notifications }: NotificationsTableProps) {
	const [readIds, setReadIds] = useState<Set<string>>(new Set());
	const decrementUnreadCount = useNotificationStore(
		s => s.decrementUnreadCount,
	);

	/**
	 * Checks if notification is read (server state or optimistic)
	 */
	function isRead(notification: Notification): boolean {
		return notification.read || readIds.has(notification.id);
	}

	/**
	 * Marks notification as read optimistically
	 */
	function handleClick(notification: Notification) {
		if (isRead(notification)) return;

		setReadIds(prev => new Set(prev).add(notification.id));
		decrementUnreadCount();
		markNotificationRead(notification.id);
	}

	if (notifications.length === 0) {
		return (
			<div className="text-muted-foreground py-12 text-center text-sm">
				No notifications yet
			</div>
		);
	}

	return (
		<div className="divide-y">
			{notifications.map(notification => (
				<button
					key={notification.id}
					type="button"
					onClick={() => handleClick(notification)}
					className={cn(
						'flex w-full items-start gap-4 px-4 py-3 text-left transition-colors',
						!isRead(notification)
							? 'bg-blue-50/60 hover:bg-blue-50'
							: 'hover:bg-accent',
					)}
				>
					<div className="mt-0.5 shrink-0">
						<NotificationIcon
							type={notification.type}
							className="text-muted-foreground size-5"
						/>
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium">{notification.title}</p>
						<p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
							{notification.body}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<span className="text-muted-foreground/70 text-xs whitespace-nowrap">
							{formatTimeAgo(notification.createdAt)}
						</span>
						{!isRead(notification) && (
							<div className="size-2 shrink-0 rounded-full bg-blue-500" />
						)}
					</div>
				</button>
			))}
		</div>
	);
}
