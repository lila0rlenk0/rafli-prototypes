'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { RAFFLE_STATUS, type RaffleStatus } from '@/types/raffle';

/** Polling interval in milliseconds — fast enough to feel responsive, slow enough to avoid hammering */
const POLL_INTERVAL_MS = 15_000;

interface RaffleAutoRefreshProps {
	/** Current raffle status from the server */
	status: RaffleStatus;
	/** ISO datetime string for raffle end time */
	endAt: string;
	/** Whether the raffle has selected winners */
	hasWinners: boolean;
}

/**
 * RaffleAutoRefresh Component
 *
 * Invisible client component that triggers router.refresh() on an interval
 * when the raffle is in a transitional state (draw pending, VRF in progress).
 * Renders nothing — pure side-effect.
 *
 * Polling activates when:
 * - `live` and past endAt → waiting for backend cron to flip to `ended`
 * - `ended` without winners → VRF draw in progress
 * - `fulfilling` → brief CAS guard before `completed`
 */
export function RaffleAutoRefresh({
	status,
	endAt,
	hasWinners,
}: RaffleAutoRefreshProps) {
	const router = useRouter();

	useEffect(() => {
		/**
		 * Determines if the raffle is in a transitional state that warrants polling.
		 * Checked each interval so polling self-disables once the transition resolves.
		 */
		function shouldPoll(): boolean {
			// Live raffle past its end time — backend cron hasn't picked it up yet
			if (status === RAFFLE_STATUS.LIVE && new Date(endAt) <= new Date())
				return true;

			// Draw initiated but VRF hasn't resolved winners yet
			if (status === RAFFLE_STATUS.ENDED && !hasWinners) return true;

			// Brief fulfilling state before completion
			if (status === RAFFLE_STATUS.FULFILLING) return true;

			return false;
		}

		if (!shouldPoll()) return;

		const interval = setInterval(() => {
			router.refresh();
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [status, endAt, hasWinners, router]);

	// Pure side-effect — no UI
	return null;
}
