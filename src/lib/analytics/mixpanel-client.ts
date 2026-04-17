'use client';

/**
 * Mixpanel browser client (Hybrid tracking - Option C)
 *
 * Autocapture handles: page views, clicks, scrolls, form submissions, rage/dead clicks
 * Server-side handles: business events (sign-up, purchase, raffle creation)
 *
 * Privacy: capture_text_content disabled, no user-entered data collected
 *
 * The `mixpanel-browser` package is dynamically imported inside `initMixpanel()`
 * to keep it out of the initial client bundle. It only loads after hydration
 * when the MixpanelProvider effect fires.
 */

import { clientEnv } from '@/env/client';

type MixpanelLib = typeof import('mixpanel-browser').default;

const TOKEN = clientEnv.NEXT_PUBLIC_MIXPANEL_TOKEN;
let initialized = false;
let mp: MixpanelLib | null = null;

/**
 * Initialize Mixpanel with autocapture for UX analytics.
 * Dynamically imports `mixpanel-browser` to defer its bundle weight.
 * @returns Promise that resolves when initialization is complete
 */
export async function initMixpanel(): Promise<void> {
	if (!TOKEN || initialized || typeof window === 'undefined') return;
	// Skip analytics in local dev — avoids polluting prod Mixpanel projects with
	// developer clicks and keeps the network panel clean while debugging.
	if (clientEnv.NODE_ENV !== 'production') return;

	const { default: mixpanel } = await import('mixpanel-browser');
	mixpanel.init(TOKEN, {
		persistence: 'localStorage',
	});

	mp = mixpanel;
	initialized = true;
}

/**
 * Identify user after authentication.
 * Sets Mixpanel distinct_id and optional profile properties.
 * @param userId - User ID to identify
 * @param properties - Optional profile properties to set
 */
export function identify(
	userId: string,
	properties?: Record<string, unknown>,
): void {
	if (!mp) return;

	mp.identify(userId);
	if (properties) {
		mp.people.set(properties);
	}
}

/**
 * Reset Mixpanel identity on sign out.
 * Clears distinct_id so post-logout events are anonymous.
 * @returns void
 */
export function reset(): void {
	if (!mp) return;
	mp.reset();
}

/**
 * Track custom client-side event (use sparingly - prefer server-side)
 * @param event - Event name
 * @param properties - Optional event properties
 */
export function track(
	event: string,
	properties?: Record<string, unknown>,
): void {
	if (!mp) return;
	mp.track(event, properties);
}
