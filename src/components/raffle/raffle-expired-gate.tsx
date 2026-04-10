'use client';

import { type ReactNode } from 'react';

import { useRaffleSaleWindow } from '@/lib/hooks/use-raffle-sale-window';

interface RaffleExpiredGateProps {
	endAt: string;
	children: ReactNode;
}

/**
 * Hides children when raffle endAt time has passed.
 * Prevents purchase race conditions by client-side time check.
 *
 * Uses `isHydrated` to avoid server/client clock divergence causing hydration mismatch.
 * Before hydration, renders children (optimistic) — the hook takes over within one tick.
 */
export function RaffleExpiredGate({ endAt, children }: RaffleExpiredGateProps) {
	const { isExpired, isHydrated } = useRaffleSaleWindow(endAt);

	// Before hydration: render children to match server output (server doesn't know client time).
	// After hydration: hide if expired based on the browser clock.
	if (isHydrated && isExpired) return null;
	return <>{children}</>;
}
