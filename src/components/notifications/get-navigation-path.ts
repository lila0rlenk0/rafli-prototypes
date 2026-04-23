import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { NOTIFICATION_TYPE, type Notification } from '@/types/notification';

/**
 * Notification types whose target is the raffle landing page
 * (`/browse/<slug>`). Grouped so the routing function can lookup the
 * set instead of carrying one case-arm per notification.
 */
const RAFFLE_LANDING_TYPES = new Set<Notification['type']>([
	NOTIFICATION_TYPE.RAFFLE_WON,
	NOTIFICATION_TYPE.RAFFLE_ENDING_SOON,
	NOTIFICATION_TYPE.RAFFLE_STARTED,
	NOTIFICATION_TYPE.RAFFLE_COMPLETED,
	NOTIFICATION_TYPE.RAFFLE_CANCELLED,
	NOTIFICATION_TYPE.NEW_RAFFLE_CREATED,
	NOTIFICATION_TYPE.FULFILLMENT_STARTED,
	NOTIFICATION_TYPE.PRIZE_CLAIM_REMINDER,
]);

/**
 * Host-side fulfillment notifications land on the raffle's fulfillment
 * dashboard at `/browse/<slug>/fulfillment`.
 */
const RAFFLE_FULFILLMENT_TYPES = new Set<Notification['type']>([
	NOTIFICATION_TYPE.HOST_SHIPPING_REMINDER,
	NOTIFICATION_TYPE.HOST_DELIVERY_CONFIRMATION_REMINDER,
	NOTIFICATION_TYPE.WINNER_CLAIMED,
	NOTIFICATION_TYPE.DELIVERY_CONFIRMED,
]);

/**
 * Types that resolve to the generic profile page — winnings,
 * disputes, and reviews all surface there today.
 */
const PROFILE_TYPES = new Set<Notification['type']>([
	NOTIFICATION_TYPE.PRIZE_SENT,
	NOTIFICATION_TYPE.PRIZE_DELIVERED,
	NOTIFICATION_TYPE.PRIZE_AUTO_CONFIRMED,
	NOTIFICATION_TYPE.DISPUTE_OPENED,
	NOTIFICATION_TYPE.DISPUTE_RESOLVED,
	NOTIFICATION_TYPE.REVIEW_RECEIVED,
]);

/**
 * Builds a raffle-scoped path under `/browse/<slug>` with an optional
 * suffix (e.g. `/fulfillment`). Shared helper keeps the call sites
 * linear — the slug fallback would otherwise pepper ternaries across
 * the switch body.
 *
 * @param metadata - Notification metadata payload (may carry slug/id).
 * @param suffix - Path segment appended after the raffle slug (no leading slash).
 * @returns Full path or `null` if the raffle identifier is missing.
 */
function buildRafflePath(
	metadata: Notification['metadata'],
	suffix = '',
): string | null {
	const slug = metadata?.publicSlug ?? metadata?.raffleId;
	if (!slug) return null;
	return suffix ? `/browse/${slug}/${suffix}` : `/browse/${slug}`;
}

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
	if (FEATURE_FLAGS.CHAT_ENABLED && type === NOTIFICATION_TYPE.CHAT_MESSAGE) {
		const conversationId = metadata?.conversationId;
		return conversationId ? `/messages/${conversationId}` : null;
	}

	if (RAFFLE_LANDING_TYPES.has(type)) return buildRafflePath(metadata);
	if (RAFFLE_FULFILLMENT_TYPES.has(type)) {
		return buildRafflePath(metadata, 'fulfillment');
	}

	if (type === NOTIFICATION_TYPE.ORDER_CONFIRMED) {
		const orderId = metadata?.orderId;
		return orderId ? `/profile/orders/${orderId}` : null;
	}

	if (PROFILE_TYPES.has(type)) return '/profile';

	return null;
}
