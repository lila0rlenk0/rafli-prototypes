'use client';

import { useEffect } from 'react';

import {
	clearSentryUser,
	getClientUserId,
	setSentryUser,
} from '@/lib/sentry/user';

/**
 * SentryUserSync Component
 *
 * Reads the `raffly-session` cookie on mount and tags the browser Sentry
 * scope with the authenticated user's ID (or clears it if anonymous). Runs
 * once per page load at the root of the client provider tree so every
 * client-side error captured after hydration carries correct attribution.
 *
 * Why a component and not an inline effect in `ProvidersClient`: the
 * cookie read must happen in a `useEffect` (not render), SSR-safe, and
 * without leaking the session shape into other providers. Keeping the
 * logic here as a single-responsibility component makes the intent
 * auditable and testable in isolation.
 *
 * Why mount-only `[]` deps: the cookie only changes on sign-in or
 * sign-out, and both server actions trigger a full server render + client
 * remount via `router.refresh()`. A pathname- or visibility-based polling
 * loop would be churn for zero signal on a static session.
 *
 * Renders nothing — pure side effect owner.
 *
 * @returns `null` — this component is mounted for its side effect only
 */
export function SentryUserSync() {
	// mount: one-shot client-side session read to bridge the server->client
	// Sentry scope gap. The server scope is set inside `getSession()` during
	// RSC rendering, but that value never reaches the browser SDK because
	// each runtime owns its own scope. Reading the session cookie here is
	// the cheapest way to mirror the server-side attribution.
	useEffect(() => {
		const userId = getClientUserId();

		if (userId) {
			setSentryUser(userId);
			return;
		}

		clearSentryUser();
	}, []);

	return null;
}
