import { RAFFLE_STATUS, type Raffle, type RaffleWinner } from '@/types/raffle';

/**
 * Lifecycle phases the simulator can stage. Each maps the timer→winners
 * pipeline onto a synthetic raffle shape so dev/staging can preview the
 * full UX without waiting for the backend cron / VRF fulfilment.
 *
 * - `idle`     — simulator off; real page renders unchanged
 * - `expired`  — Phase B: `live` past `endAt` (cron hasn't flipped status)
 * - `drawing`  — Phase C: `ended`, no winners yet (draw pipeline / awaiting VRF)
 * - `fulfilling` — Phase D: `fulfilling`, VRF fulfilled, backend CAS before winner write
 *   (same draw-card UX as `drawing`; status differs only for polling/copy)
 * - `winner` / `loser` — Phase E: `completed` with winners on the raffle row,
 *   previewing the resting end-state card directly
 * - `reveal-win` / `reveal-lose` — Phase E first-encounter: same `completed`
 *   data, but routed through the full `RaffleRevealExperience` (green intro
 *   card → "Reveal the winner" → loading/revealing/outcome animation)
 */
export const SIM_PHASE = {
	IDLE: 'idle',
	EXPIRED: 'expired',
	DRAWING: 'drawing',
	FULFILLING: 'fulfilling',
	WINNER: 'winner',
	LOSER: 'loser',
	REVEAL_WIN: 'reveal-win',
	REVEAL_LOSE: 'reveal-lose',
} as const;

export type SimPhase = (typeof SIM_PHASE)[keyof typeof SIM_PHASE];

const SYNTHETIC_WINNER_NAME = 'A lucky entrant';

/**
 * Returns the simulated raffle for the given phase, leaving the real raffle
 * untouched for `idle`. Overrides only the timing/status/winners triplet —
 * every other field (title, host, prize) is preserved so the simulation reads
 * as the same sweepstakes.
 *
 * @returns Synthetic raffle reflecting the requested phase
 */
export function applyPhaseToRaffle(raffle: Raffle, phase: SimPhase): Raffle {
	if (phase === SIM_PHASE.IDLE) return raffle;

	const pastEndAt = new Date(Date.now() - 5_000).toISOString();
	const syntheticWinners: RaffleWinner[] = [
		{
			oddsId: 1,
			ticketCode: 'SIM-0001',
			name: SYNTHETIC_WINNER_NAME,
			position: 1,
			status: 'awarded',
		},
	];

	switch (phase) {
		case SIM_PHASE.EXPIRED:
			return { ...raffle, endAt: pastEndAt, status: RAFFLE_STATUS.LIVE };
		case SIM_PHASE.DRAWING:
			return {
				...raffle,
				endAt: pastEndAt,
				status: RAFFLE_STATUS.ENDED,
				winners: [],
			};
		case SIM_PHASE.FULFILLING:
			return {
				...raffle,
				endAt: pastEndAt,
				status: RAFFLE_STATUS.FULFILLING,
				winners: [],
			};
		// All Phase E variants share the same concluded raffle shape; the
		// winner-vs-loser split is carried by the result card the override
		// renders, and the direct-card-vs-reveal split lives there too.
		case SIM_PHASE.WINNER:
		case SIM_PHASE.LOSER:
		case SIM_PHASE.REVEAL_WIN:
		case SIM_PHASE.REVEAL_LOSE:
			return {
				...raffle,
				endAt: pastEndAt,
				status: RAFFLE_STATUS.COMPLETED,
				winners: syntheticWinners,
			};
		default: {
			const exhaustiveCheck: never = phase;
			return exhaustiveCheck;
		}
	}
}

/** Whether the simulator is currently overriding page state. */
export function isSimulating(phase: SimPhase): boolean {
	return phase !== SIM_PHASE.IDLE;
}
