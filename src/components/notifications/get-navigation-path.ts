import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { NOTIFICATION_TYPE, type Notification } from '@/types/notification';

/**
 * Gets navigation path based on notification type and metadata
 *
 * @param notification - The notification object
 * @returns Path to navigate to, or null if no navigation
 */
export function getNavigationPath(notification: Notification): string | null {
	const { type, metadata } = notification;

	// Chat messages land in the dedicated /messages inbox. Guarded by the
	// feature flag so the flag-off path keeps today's no-op behaviour (the
	// chat notification stays visible in the bell but doesn't navigate).
	if (
		FEATURE_FLAGS.CHAT_ENABLED &&
		type === NOTIFICATION_TYPE.CHAT_MESSAGE &&
		metadata?.conversationId
	) {
		return `/messages/${metadata.conversationId}`;
	}

	switch (type) {
		// Raffle notifications - use publicSlug if available, fallback to raffleId
		case NOTIFICATION_TYPE.RAFFLE_WON:
		case NOTIFICATION_TYPE.RAFFLE_ENDING_SOON:
		case NOTIFICATION_TYPE.RAFFLE_STARTED:
		case NOTIFICATION_TYPE.RAFFLE_COMPLETED:
		case NOTIFICATION_TYPE.RAFFLE_CANCELLED:
		case NOTIFICATION_TYPE.NEW_RAFFLE_CREATED:
		case NOTIFICATION_TYPE.FULFILLMENT_STARTED:
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
