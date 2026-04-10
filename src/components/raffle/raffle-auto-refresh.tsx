'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { RaffleStatus } from '@/types/raffle';
import {
	getAutoRefreshTimeoutMs,
	type RaffleAutoRefreshPhase,
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
 * Invisible component — triggers router.refresh() on an interval during transitional states.
 * Active when: live+past endAt (waiting for cron), ended without winners (VRF in progress), fulfilling.
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
	const [timedOutPhase, setTimedOutPhase] =
		useState<null | RaffleAutoRefreshPhase>(null);
	const phaseTimedOut = timedOutPhase === phase;

	// Timeout effect — caps how long each phase polls before giving up.
	// Deps: phase (restart when phase changes), timedOutPhase (skip if already expired).
	// Cleanup: clears timer if phase changes before budget exhausted.
	useEffect(() => {
		if (!phase) return;
		if (timedOutPhase === phase) return;

		const timeout = setTimeout(() => {
			setTimedOutPhase(phase);
		}, getAutoRefreshTimeoutMs(phase));

		return () => clearTimeout(timeout);
	}, [phase, timedOutPhase]);

	// Polling effect — refreshes the route on POLL_INTERVAL_MS while a transitional phase is active.
	// Fires an immediate refresh on phase activation so the user doesn't wait a full interval
	// for stale data to update (e.g., page loaded while raffle is live but past endAt).
	// Deps: phase (active phase controls start/stop), phaseTimedOut (stops when budget exhausted),
	// router (stable Next.js router instance — included for exhaustive-deps).
	// Cleanup: clears interval on phase change, timeout, or unmount.
	useEffect(() => {
		if (!phase || phaseTimedOut) return;

		// Immediate refresh so stale server data updates without waiting a full interval
		router.refresh();

		const interval = setInterval(() => {
			router.refresh();
		}, POLL_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [phase, phaseTimedOut, router]);

	// Pure side-effect — no UI
	return null;
}
