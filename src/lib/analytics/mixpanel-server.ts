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

const mp = env.MIXPANEL_TOKEN ? Mixpanel.init(env.MIXPANEL_TOKEN) : null;

export interface TrackOptions {
	userId?: string;
	deviceId?: string;
}

/**
 * Track server-side event (auto-fetches client IP)
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
		distinct_id: userId || deviceId || 'anonymous',
		$user_id: userId,
		$device_id: deviceId,
		...(ip && { ip }),
		time: Date.now(),
	});
}

/**
 * Set user profile properties
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
 */
export function incrementUserProperty(
	userId: string,
	property: string,
	value = 1,
): void {
	if (!mp) return;
	mp.people.increment(userId, property, value);
}
