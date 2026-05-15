'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { NotificationList } from '@/components/notifications/list';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { useNotificationStore } from '@/providers/notification-store-provider';
import { useMarkAllNotificationsRead } from '@/services/notification/use-mark-all-read';
import { useNotifications } from '@/services/notification/use-notifications';

export function NotificationPopover() {
	const [open, setOpen] = useState(false);

	const unreadCount = useNotificationStore(s => s.unreadCount);
	const clearUnreadCount = useNotificationStore(s => s.clearUnreadCount);

	// Fetch notifications only when popover is open — avoids unnecessary API calls on every page load
	const { data, isLoading } = useNotifications({
		limit: 20,
		enabled: open,
	});
	const markAllRead = useMarkAllNotificationsRead();

	function handleMarkAllRead() {
		markAllRead.mutate(undefined, {
			onSuccess() {
				clearUnreadCount();
			},
		});
	}

	function handleClose() {
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="relative inline-flex cursor-pointer items-center justify-center"
					aria-label="Notifications"
				>
					<Bell className="size-5" />
					{unreadCount > 0 ? (
						<span className="bg-brand-dark text-on-dark text-3xs absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full font-medium">
							{unreadCount > 9 ? '9+' : unreadCount}
						</span>
					) : null}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-96 p-0">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h3 className="text-sm font-semibold">Notifications</h3>
					<div className="flex items-center gap-2">
						{unreadCount > 0 ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleMarkAllRead}
								disabled={markAllRead.isPending}
								className="h-auto px-2 py-1 text-xs"
							>
								{markAllRead.isPending ? 'Marking...' : 'Mark all read'}
							</Button>
						) : null}
						<Link
							href="/profile/notifications"
							onClick={handleClose}
							className="text-xs font-medium text-blue-600 hover:underline"
						>
							View All
						</Link>
					</div>
				</div>
				<div className="max-h-96 overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Spinner />
						</div>
					) : (
						<NotificationList
							notifications={data?.notifications ?? []}
							onClose={handleClose}
						/>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
