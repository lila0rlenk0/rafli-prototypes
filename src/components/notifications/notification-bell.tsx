'use client';

import { NotificationPopover } from '@/components/notifications/notification-popover';

/**
 * Notification bell component for navbar
 * Wraps NotificationPopover for consistent interface
 */
export function NotificationBell() {
	return <NotificationPopover />;
}
