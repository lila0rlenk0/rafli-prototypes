'use client';

import { useSyncExternalStore } from 'react';

/**
 * Drives mount-time visibility of the mobile sticky CTA.
 *
 * Why a hook instead of hard-coding `true`: breakpoint gating happens at
 * the CSS level via `lg:hidden`, but we still keep a JS-level seam so
 * future work can layer intersection-observer hiding (e.g. hide when
 * the inline `TicketPurchaseCard` is in-view) without touching the
 * shell composition. Implemented via `useSyncExternalStore` — the
 * canonical React 19 pattern for a subscription-based boolean that is
 * SSR-safe (getServerSnapshot returns `true` so SSR paints the bar and
 * CSS handles desktop gating).
 *
 * @returns `{ visible }` — whether the sticky bar should render now.
 */
export function useStickyVisibility(): { visible: boolean } {
	const visible = useSyncExternalStore(
		// No external subscription yet — return a no-op unsubscribe so
		// React doesn't re-subscribe on every render. Adding scroll /
		// intersection listeners later wires through this callback.
		noopSubscribe,
		clientSnapshot,
		serverSnapshot,
	);
	return { visible };
}

// Extracted to module scope so the identities are stable across
// renders — `useSyncExternalStore` re-reads snapshots on every render
// and requires stable function references to avoid tearing warnings.
function noopSubscribe(): () => void {
	return () => {};
}
function clientSnapshot(): boolean {
	return true;
}
function serverSnapshot(): boolean {
	return true;
}
