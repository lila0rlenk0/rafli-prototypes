'use client';

import { type ReactNode } from 'react';

import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';

interface RaffleExpiredGateProps {
	endAt: string;
	children: ReactNode;
	/**
	 * Rendered in place of `children` once endAt has passed. Defaults to
	 * `null` (children are hidden). Use this to swap chrome — e.g., flip
	 * "The sweepstakes is active!" to a "Drawing winners…" heading — so the
	 * post-expiry surface doesn't read like a contradiction during the
	 * AWAITING_STATUS_FLIP window before the backend cron moves status off
	 * `live`.
	 */
	fallback?: ReactNode;
}

/**
 * Swaps between live-sale children and an optional expired fallback once
 * `endAt` has passed. Default behavior (no `fallback`) still gates purchase
 * race conditions by hiding children client-side.
 *
 * Uses `isHydrated` to avoid server/client clock divergence causing hydration
 * mismatch — pre-hydration always renders `children` to match server output.
 */
export function RaffleExpiredGate({
	endAt,
	children,
	fallback,
}: RaffleExpiredGateProps) {
	const { isExpired, isHydrated } = useRaffleSaleWindow(endAt);

	if (isHydrated && isExpired) return <>{fallback ?? null}</>;
	return <>{children}</>;
}
