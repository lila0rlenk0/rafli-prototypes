import {
	AlertCircle,
	CheckCircle,
	Clock,
	Gift,
	Package,
	ShoppingCart,
	Star,
	Trophy,
	XCircle,
	type LucideIcon,
} from 'lucide-react';

import { NOTIFICATION_TYPE, type NotificationType } from '@/types/notification';

const NOTIFICATION_ICON_MAP: Record<NotificationType, LucideIcon> = {
	[NOTIFICATION_TYPE.DELIVERY_CONFIRMED]: CheckCircle,
	[NOTIFICATION_TYPE.DISPUTE_OPENED]: AlertCircle,
	[NOTIFICATION_TYPE.DISPUTE_RESOLVED]: CheckCircle,
	[NOTIFICATION_TYPE.FULFILLMENT_STARTED]: Package,
	[NOTIFICATION_TYPE.HOST_DELIVERY_CONFIRMATION_REMINDER]: Clock,
	[NOTIFICATION_TYPE.HOST_SHIPPING_REMINDER]: Package,
	[NOTIFICATION_TYPE.NEW_RAFFLE_CREATED]: Gift,
	[NOTIFICATION_TYPE.ORDER_CONFIRMED]: ShoppingCart,
	[NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_COMPLETED]: AlertCircle,
	[NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_HOST]: AlertCircle,
	[NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_NON_WINNER]: AlertCircle,
	[NOTIFICATION_TYPE.PARTIAL_PARTICIPATION_WINNER]: Trophy,
	[NOTIFICATION_TYPE.PRIZE_CLAIM_REMINDER]: Trophy,
	[NOTIFICATION_TYPE.PRIZE_AUTO_CONFIRMED]: CheckCircle,
	[NOTIFICATION_TYPE.PRIZE_DELIVERED]: Package,
	[NOTIFICATION_TYPE.PRIZE_SENT]: Package,
	[NOTIFICATION_TYPE.RAFFLE_CANCELLED]: XCircle,
	[NOTIFICATION_TYPE.RAFFLE_COMPLETED]: CheckCircle,
	[NOTIFICATION_TYPE.RAFFLE_ENDING_SOON]: Clock,
	[NOTIFICATION_TYPE.RAFFLE_STARTED]: Gift,
	[NOTIFICATION_TYPE.RAFFLE_WON]: Trophy,
	[NOTIFICATION_TYPE.REVIEW_RECEIVED]: Star,
	[NOTIFICATION_TYPE.WINNER_CLAIMED]: Trophy,
};

interface NotificationIconProps {
	type: NotificationType;
	className?: string;
}

/**
 * Maps notification type to appropriate icon
 *
 * @param type - The notification type
 * @param className - Optional className for the icon
 */
export function NotificationIcon({ type, className }: NotificationIconProps) {
	const Icon = NOTIFICATION_ICON_MAP[type] || Gift;
	return <Icon className={className} />;
}
