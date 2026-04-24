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

// `mixpanel` (v0.20.x) issues `http.request()` with no timeout. Without
// this ceiling an unreachable api.mixpanel.com would keep the Node
// serverless function alive via an open socket until Vercel's maxDuration.
const MIXPANEL_TIMEOUT_MS = 2_000;

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
 * @returns Resolves when Mixpanel acknowledges the event OR after `MIXPANEL_TIMEOUT_MS`, whichever is first
 */
export async function trackServer(
	event: string,
	properties: Record<string, unknown>,
	options: TrackOptions = {},
): Promise<void> {
	if (!mp) return;
	const client = mp;

	const { userId, deviceId, ip: providedIp } = options;
	const ip = providedIp !== undefined ? providedIp : await getClientIp();

	const payload = {
		...properties,
		// Mixpanel requires distinct_id — fall back to "anonymous" for unauthenticated events
		distinct_id: userId || deviceId || 'anonymous',
		$user_id: userId,
		$device_id: deviceId,
		...(ip && { ip }),
		time: Date.now(),
	};

	// Race the SDK's callback against a hard timer — the SDK has no request
	// timeout so a stalled endpoint would otherwise never resolve. Double
	// resolve is harmless (Promise spec ignores subsequent calls).
	await new Promise<void>(resolve => {
		const timer = setTimeout(resolve, MIXPANEL_TIMEOUT_MS);
		function done(): void {
			clearTimeout(timer);
			resolve();
		}
		try {
			client.track(event, payload, done);
		} catch {
			done();
		}
	});
}

/**
 * Schedules `trackServer` as non-blocking work after the response, safe to call
 * from route handlers, server actions, and RSCs.
 *
 * Resolves the client IP while still in request scope (where `headers()` is
 * legal) and forwards it into the deferred `after()` callback — Next.js
 * forbids `headers()` inside `after()`, so `trackServer` can't safely
 * self-lookup from within the callback once the response has shipped.
 *
 * @param event - Mixpanel event name
 * @param properties - Event properties
 * @param options - User/device identification (ip is resolved here and forwarded)
 * @returns Resolves once the IP lookup completes and the deferred task is scheduled — does NOT await the Mixpanel round-trip
 */
export async function trackAfter(
	event: string,
	properties: Record<string, unknown>,
	options: Omit<TrackOptions, 'ip'> = {},
): Promise<void> {
	if (!mp) return;

	const ip = await getClientIp();

	runAfter(async () => {
		await trackServer(event, properties, { ...options, ip });
	});
}
