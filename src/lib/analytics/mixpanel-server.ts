import Mixpanel from 'mixpanel';

import { env } from '@/env/server';
import { getClientIp } from '@/lib/api/client';

/**
 * Mixpanel server client
 *
 * Used for: business-critical events (sign-up, purchase, raffle creation)
 * Benefits: ad-blocker resistant, 15-30% more accurate than client-side
 *
 * IP is fetched automatically via cached getClientIp() for accurate geolocation
 */

// Skip analytics in local dev — avoids polluting prod Mixpanel projects with
// developer activity. Staging/production (NODE_ENV='production') still track.
const mp =
	env.MIXPANEL_TOKEN && env.NODE_ENV === 'production'
		? Mixpanel.init(env.MIXPANEL_TOKEN)
		: null;

export interface TrackOptions {
	userId?: string;
	deviceId?: string;
}

/**
 * Track server-side event (auto-fetches client IP for geolocation).
 *
 * @param event - Mixpanel event name (use constants from events.ts)
 * @param properties - Event properties (business context: raffleId, amount, etc.)
 * @param options - User/device identification
 * @returns Promise that resolves when tracking is complete
 */
export async function trackServer(
	event: string,
	properties: Record<string, unknown>,
	options: TrackOptions = {},
): Promise<void> {
	if (!mp) return;

	const { userId, deviceId } = options;
	const ip = await getClientIp();

	mp.track(event, {
		...properties,
		// Mixpanel requires distinct_id — fall back to "anonymous" for unauthenticated events
		distinct_id: userId || deviceId || 'anonymous',
		$user_id: userId,
		$device_id: deviceId,
		...(ip && { ip }),
		time: Date.now(),
	});
}

/**
 * Set user profile properties
 * @param userId - Mixpanel distinct user ID
 * @param properties - Key-value profile properties to set
 */
export function setUserProperties(
	userId: string,
	properties: Record<string, unknown>,
): void {
	if (!mp) return;
	mp.people.set(userId, properties);
}

/**
 * Increment a user property (e.g., total_purchases)
 * @param userId - Mixpanel distinct user ID
 * @param property - Property name to increment
 * @param value - Amount to increment by (default 1)
 */
export function incrementUserProperty(
	userId: string,
	property: string,
	value = 1,
): void {
	if (!mp) return;
	mp.people.increment(userId, property, value);
}
