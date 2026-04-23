import Mixpanel from 'mixpanel';

import { env } from '@/env/server';
import { getClientIp } from '@/lib/api/client';
import { runAfter } from '@/lib/utils/run-after';

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
	/**
	 * Pre-resolved client IP. Required when `trackServer` is called inside an
	 * `after()` / `runAfter` callback — `headers()` is illegal there, so the
	 * caller must resolve the IP in request scope and forward it. Use
	 * `trackAfter()` to handle this automatically.
	 */
	ip?: string | null;
}

/**
 * Track server-side event (auto-fetches client IP for geolocation when not supplied).
 *
 * Do NOT call this directly inside `after()` / `runAfter()` — the default
 * IP lookup reads `headers()`, which Next.js forbids in after-callbacks.
 * Use `trackAfter()` instead, which resolves the IP in request scope.
 *
 * @param event - Mixpanel event name (use constants from events.ts)
 * @param properties - Event properties (business context: raffleId, amount, etc.)
 * @param options - User/device identification; pass `ip` to skip the headers() lookup
 * @returns Promise that resolves when tracking is complete
 */
export async function trackServer(
	event: string,
	properties: Record<string, unknown>,
	options: TrackOptions = {},
): Promise<void> {
	if (!mp) return;

	const { userId, deviceId, ip: providedIp } = options;
	// Only touch headers() when the caller didn't pre-resolve the IP — required
	// to stay safe inside after() callbacks, which cannot access headers().
	const ip = providedIp !== undefined ? providedIp : await getClientIp();

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
 * Schedules `trackServer` as non-blocking work after the response, safe to call
 * from route handlers, server actions, and RSCs.
 *
 * Resolves the client IP synchronously in request scope (where `headers()` is
 * legal) before handing control to `runAfter`. This is the canonical way to
 * fire analytics post-response — Next.js forbids `headers()` inside `after()`,
 * so `trackServer` can't safely self-lookup from within the callback.
 *
 * @param event - Mixpanel event name
 * @param properties - Event properties
 * @param options - User/device identification (ip is resolved here and forwarded)
 */
export async function trackAfter(
	event: string,
	properties: Record<string, unknown>,
	options: Omit<TrackOptions, 'ip'> = {},
): Promise<void> {
	if (!mp) return;

	// Step 1: Resolve IP in request scope — headers() is illegal inside after().
	const ip = await getClientIp();

	// Step 2: Defer the Mixpanel round-trip until after the response ships.
	runAfter(async () => {
		await trackServer(event, properties, { ...options, ip });
	});
}
