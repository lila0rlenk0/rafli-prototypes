'use client';

import { useSyncExternalStore } from 'react';

/**
 * Module-scope snapshots so `useSyncExternalStore` receives reference-
 * stable callbacks across renders. Inline arrows would tear down the
 * subscription each render and defeat the "mount flag" pattern.
 */
function subscribeNoop(): () => void {
	return function unsubscribe() {};
}
function getClientSnapshot(): boolean {
	return true;
}
function getServerSnapshot(): boolean {
	return false;
}

/**
 * SSR-safe "am I hydrated?" flag via the React 18 store primitive.
 *
 * SSR + the first client render both read the server snapshot
 * (`false`), so hydration matches byte-for-byte. React then flips to
 * the client snapshot (`true`) in a follow-up commit — no
 * `setState`-in-effect, no hydration warning, no `Date.now()` read
 * during render (which the `react-hooks` purity rule forbids).
 *
 * Used by countdown surfaces (`launch-countdown`, `urgency-countdown`)
 * that need to gate their live ticker behind hydration without
 * flashing placeholder values.
 *
 * @returns `false` on SSR and the first client render, `true` after
 *   hydration commits
 */
export function useHasMounted(): boolean {
	return useSyncExternalStore(
		subscribeNoop,
		getClientSnapshot,
		getServerSnapshot,
	);
}
