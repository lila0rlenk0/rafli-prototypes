import { RAFFLE_STATUS, type RaffleStatus } from '@/types/raffle';

// ==========================================
// Types
// ==========================================

/**
 * Transitional raffle states that justify route refresh polling.
 *
 * These are intentionally phase-based instead of boolean so we can assign a
 * separate timeout budget to each backend transition.
 */
export const RAFFLE_AUTO_REFRESH_PHASE = {
	AWAITING_COMPLETION: 'awaiting-completion',
	AWAITING_STATUS_FLIP: 'awaiting-status-flip',
	AWAITING_WINNERS: 'awaiting-winners',
} as const;

export type RaffleAutoRefreshPhase =
	(typeof RAFFLE_AUTO_REFRESH_PHASE)[keyof typeof RAFFLE_AUTO_REFRESH_PHASE];

interface ResolveAutoRefreshPhaseInput {
	endAt: string;
	hasWinners: boolean;
	now?: Date;
	status: RaffleStatus;
}

// ==========================================
// Constants
// ==========================================

/**
 * Per-phase timeout budgets.
 *
 * Why these values:
 * - `live` past endAt should flip quickly once the backend scheduler catches up,
 *   but we still allow a few cron windows before giving up.
 * - `ended` without winners depends on VRF/draw finalization, which is the slowest
 *   of the three and deserves the largest budget.
 * - `fulfilling` should be brief; once we have winners, completion should settle fast.
 */
export const AUTO_REFRESH_TIMEOUT_MS: Record<RaffleAutoRefreshPhase, number> = {
	[RAFFLE_AUTO_REFRESH_PHASE.AWAITING_STATUS_FLIP]: 10 * 60 * 1_000,
	// 30 min — backend VRF hard cutoff is 60 min (poll-vrf-fulfillment.command.ts).
	// Previous 15 min budget caused the page to stop polling while Chainlink VRF
	// was still in flight (gas spikes, subscription funding delays). 30 min covers
	// the 99th percentile VRF latency while still expiring for truly broken draws.
	[RAFFLE_AUTO_REFRESH_PHASE.AWAITING_WINNERS]: 30 * 60 * 1_000,
	[RAFFLE_AUTO_REFRESH_PHASE.AWAITING_COMPLETION]: 2 * 60 * 1_000,
};

// ==========================================
// Helpers
// ==========================================

/**
 * Resolves the current auto-refresh phase for a raffle detail page.
 *
 * Returns null for steady states. Callers can then decide whether to start/stop
 * polling and which timeout budget to apply.
 */
export function resolveRaffleAutoRefreshPhase({
	endAt,
	hasWinners,
	now = new Date(),
	status,
}: ResolveAutoRefreshPhaseInput): null | RaffleAutoRefreshPhase {
	if (status === RAFFLE_STATUS.LIVE && new Date(endAt) <= now) {
		return RAFFLE_AUTO_REFRESH_PHASE.AWAITING_STATUS_FLIP;
	}

	if (status === RAFFLE_STATUS.ENDED && !hasWinners) {
		return RAFFLE_AUTO_REFRESH_PHASE.AWAITING_WINNERS;
	}

	if (status === RAFFLE_STATUS.FULFILLING) {
		return RAFFLE_AUTO_REFRESH_PHASE.AWAITING_COMPLETION;
	}

	return null;
}

/**
 * Timeout budget for a specific auto-refresh phase.
 */
export function getAutoRefreshTimeoutMs(phase: RaffleAutoRefreshPhase): number {
	return AUTO_REFRESH_TIMEOUT_MS[phase];
}
