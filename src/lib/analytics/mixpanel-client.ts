'use client';

/**
 * Mixpanel browser client (Hybrid tracking - Option C)
 *
 * Autocapture handles: page views, clicks, scrolls, form submissions, rage/dead clicks
 * Server-side handles: business events (sign-up, purchase, raffle creation)
 *
 * Privacy: capture_text_content disabled, no user-entered data collected
 */

import mixpanel from 'mixpanel-browser';

import { clientEnv } from '@/env/client';

const TOKEN = clientEnv.NEXT_PUBLIC_MIXPANEL_TOKEN;
let initialized = false;

/**
 * Initialize Mixpanel with autocapture for UX analytics
 */
export function initMixpanel(): void {
	if (!TOKEN || initialized || typeof window === 'undefined') return;

	mixpanel.init(TOKEN, {
		debug: process.env.NODE_ENV === 'development',
		persistence: 'localStorage',
		autocapture: {
			pageview: 'full-url',
			click: true,
			submit: true,
			scroll: true,
			rage_click: true,
			dead_click: true,
			input: false,
			capture_text_content: false,
		},
	});

	initialized = true;
}

/**
 * Identify user after authentication
 */
export function identify(
	userId: string,
	properties?: Record<string, unknown>,
): void {
	if (!initialized) return;

	mixpanel.identify(userId);
	if (properties) {
		mixpanel.people.set(properties);
	}
}

/**
 * Reset identity on sign out
 */
export function reset(): void {
	if (!initialized) return;
	mixpanel.reset();
}

/**
 * Track custom client-side event (use sparingly - prefer server-side)
 */
export function track(
	event: string,
	properties?: Record<string, unknown>,
): void {
	if (!initialized) return;
	mixpanel.track(event, properties);
}
