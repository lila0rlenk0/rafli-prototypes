'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { RaffleStatus } from '@/types/raffle';
import {
	getAutoRefreshTimeoutMs,
	resolveRaffleAutoRefreshPhase,
} from '@/components/raffle/raffle-auto-refresh-state';

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
	const phase = resolveRaffleAutoRefreshPhase({ status, endAt, hasWinners });
	// Once a phase exhausts its budget, stop refreshing until the server moves the raffle
	// into a different phase (or a steady state).
	const [phaseTimedOut, setPhaseTimedOut] = useState(false);

	useEffect(() => {
		if (!phase) return;

		const timeout = setTimeout(() => {
			setPhaseTimedOut(true);
		}, getAutoRefreshTimeoutMs(phase));

		return function cleanup() {
			clearTimeout(timeout);
			setPhaseTimedOut(false);
		};
	}, [phase]);

	useEffect(() => {
		if (!phase || phaseTimedOut) return;

		const interval = setInterval(() => {
			router.refresh();
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [phase, phaseTimedOut, router]);

	// Pure side-effect — no UI
	return null;
}
