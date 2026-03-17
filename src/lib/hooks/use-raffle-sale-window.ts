'use client';

import { useEffect, useMemo, useState } from 'react';

import {
	getRaffleSaleWindow,
	type RaffleSaleWindow,
} from '@/lib/utils/raffle-sale-window';

interface UseRaffleSaleWindowResult extends RaffleSaleWindow {
	isHydrated: boolean;
}

/**
 * Live raffle sale-window state for client UI.
 *
 * Why the hook exposes `isHydrated`:
 * - countdown + warning banners depend on "now"
 * - rendering them during SSR risks hydration mismatch near threshold boundaries
 * - callers can suppress time-sensitive UI until the browser clock takes over
 */
export function useRaffleSaleWindow(endAt: string): UseRaffleSaleWindowResult {
	const [now, setNow] = useState<Date | null>(null);

	const saleWindow = useMemo<RaffleSaleWindow>(() => {
		return getRaffleSaleWindow(endAt, now ?? new Date());
	}, [endAt, now]);

	useEffect(() => {
		let interval: ReturnType<typeof setInterval> | null = null;

		/**
		 * Syncs clock and stops polling once expired.
		 * Called immediately via setTimeout(0) for hydration, then every 1s via interval.
		 */
		function syncNow() {
			const nextNow = new Date();
			setNow(nextNow);

			// Stop polling once the raffle has closed. Terminal state is static.
			if (getRaffleSaleWindow(endAt, nextNow).isExpired && interval) {
				clearInterval(interval);
				interval = null;
			}
		}

		const hydrationTimeout = setTimeout(syncNow, 0);
		interval = setInterval(syncNow, 1_000);

		return () => {
			clearTimeout(hydrationTimeout);
			if (interval) clearInterval(interval);
		};
	}, [endAt]);

	return {
		isHydrated: now !== null,
		...saleWindow,
	};
}
