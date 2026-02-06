'use client';

import { Bell } from 'lucide-react';
import { useCallback, useState } from 'react';

import { NotificationList } from '@/components/notifications/notification-list';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { useNotificationStore } from '@/providers/notification-store-provider';
import { getNotifications } from '@/services/notification/get-notifications';
import { markAllNotificationsRead } from '@/services/notification/mark-all-notifications-read';
import type { Notification } from '@/types/notification';

/**
 * Notification popover with bell trigger and notifications list
 * Fetches notifications on-demand when opened
 */
export function NotificationPopover() {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [markingAllRead, setMarkingAllRead] = useState(false);

	const unreadCount = useNotificationStore(s => s.unreadCount);
	const clearUnreadCount = useNotificationStore(s => s.clearUnreadCount);

	/**
	 * Fetches notifications when popover opens
	 */
	const handleOpenChange = useCallback(async (isOpen: boolean) => {
		setOpen(isOpen);

		if (isOpen) {
			setLoading(true);
			const result = await getNotifications({ limit: 20 });
			if (result.success) {
				setNotifications(result.data.notifications);
			}
			setLoading(false);
		}
	}, []);

	/**
	 * Marks all notifications as read
	 */
	async function handleMarkAllRead() {
		setMarkingAllRead(true);
		const result = await markAllNotificationsRead();
		if (result.success) {
			clearUnreadCount();
			setNotifications(prev => prev.map(n => ({ ...n, read: true })));
		}
		setMarkingAllRead(false);
	}

	/**
	 * Closes the popover
	 */
	function handleClose() {
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="relative inline-flex items-center justify-center"
					aria-label="Notifications"
				>
					<Bell className="size-5" />
					{unreadCount > 0 && (
						<span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
							{unreadCount > 9 ? '9+' : unreadCount}
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h3 className="text-sm font-semibold">Notifications</h3>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleMarkAllRead}
							disabled={markingAllRead}
							className="h-auto px-2 py-1 text-xs"
						>
							{markingAllRead ? 'Marking...' : 'Mark all read'}
						</Button>
					)}
				</div>
				<div className="max-h-96 overflow-y-auto">
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Spinner />
						</div>
					) : (
						<NotificationList
							notifications={notifications}
							onClose={handleClose}
						/>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
